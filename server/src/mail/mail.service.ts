import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { ContactPayload } from '../schemas/contact.schema';
import { sendViaBrevo, type MailPayload } from './brevo-mail.sender';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private buildMailPayload(
    data: ContactPayload,
    ownerEmail: string,
    fromEmail: string,
  ): MailPayload {
    const { name, phone, email, comment } = data;
    const safeName = this.escapeHtml(name);
    const safePhone = this.escapeHtml(phone);
    const safeEmail = this.escapeHtml(email);
    const safeComment = this.escapeHtml(comment).replace(/\n/g, '<br>');

    return {
      fromName: 'Вугар Гулиев — портфолио',
      fromEmail,
      ownerEmail,
      userEmail: email,
      subjectOwner: `Новая заявка от ${name}`,
      subjectUser: 'Копия вашего обращения',
      ownerHtml: `
      <h2>Новая заявка с сайта</h2>
      <p><strong>Имя:</strong> ${safeName}</p>
      <p><strong>Телефон:</strong> ${safePhone}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Комментарий:</strong></p>
      <p>${safeComment}</p>
    `,
      userHtml: `
      <h2>Спасибо за обращение, ${safeName}!</h2>
      <p>Мы получили ваше сообщение и свяжемся с вами в ближайшее время.</p>
      <hr>
      <p><strong>Ваши данные:</strong></p>
      <p>Телефон: ${safePhone}</p>
      <p>Email: ${safeEmail}</p>
      <p><strong>Комментарий:</strong></p>
      <p>${safeComment}</p>
    `,
      ownerText: `Имя: ${name}\nТелефон: ${phone}\nEmail: ${email}\n\n${comment}`,
      userText: `Спасибо, ${name}!\n\nМы получили ваше сообщение.\n\n${comment}`,
    };
  }

  private resolveFromEmail(): string | null {
    return (
      this.config.get<string>('MAIL_FROM')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim() ||
      this.config.get<string>('OWNER_EMAIL')?.trim() ||
      null
    );
  }

  private resolveSmtpOptions(): SMTPTransport.Options | null {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();

    if (!host || !user || !pass) {
      return null;
    }

    const port = Number(this.config.get('SMTP_PORT') ?? 465);
    const secureSetting = this.config.get<string>('SMTP_SECURE')?.trim().toLowerCase();

    const secure =
      secureSetting === 'true' ||
      (secureSetting !== 'false' && port === 465);

    return {
      host,
      port,
      secure,
      requireTLS: !secure && port === 587,
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 15_000,
      tls: {
        minVersion: 'TLSv1.2',
        servername: host,
      },
    };
  }

  private getTransporter() {
    const options = this.resolveSmtpOptions();
    if (!options) {
      return null;
    }
    return nodemailer.createTransport(options);
  }

  private handleSmtpError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(message);

    if (message.includes('Greeting never received')) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'SMTP-сервер не ответил. Для Яндекс.Почты: SMTP_HOST=smtp.yandex.ru, SMTP_PORT=465, SMTP_SECURE=true.',
      });
    }

    if (
      message.includes('authentication failed') ||
      message.includes('535') ||
      message.includes('access rights')
    ) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'Ошибка входа в Яндекс.Почту. Создайте пароль приложения (id.yandex.ru → Безопасность → Пароли приложений) и включите «Почта» в настройках ящика. Обычный пароль не подойдёт.',
      });
    }

    if (
      message.includes('ETIMEDOUT') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('timeout')
    ) {
      const renderHint = process.env.RENDER
        ? ' Render Free блокирует SMTP (порты 465/587). Добавьте BREVO_API_KEY в Environment или переведите сервис на платный тариф Render.'
        : '';

      throw new ServiceUnavailableException({
        ok: false,
        message: `Не удалось подключиться к почтовому серверу. Проверьте SMTP_HOST, порт и интернет-соединение.${renderHint}`,
      });
    }

    if (message.includes('recipient') || message.includes('Mailbox')) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'Не удалось доставить письмо на указанный email. Проверьте адрес получателя.',
      });
    }

    throw new ServiceUnavailableException({
      ok: false,
      message: 'Не удалось отправить письмо. Попробуйте позже или проверьте SMTP в .env.',
    });
  }

  private handleBrevoError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(message);

    if (message.includes('401') || message.includes('unauthorized')) {
      throw new ServiceUnavailableException({
        ok: false,
        message: 'Неверный BREVO_API_KEY. Проверьте ключ в Environment на Render.',
      });
    }

    if (
      message.includes('sender') ||
      message.includes('not verified') ||
      message.includes('invalid')
    ) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'Email отправителя не подтверждён в Brevo. Подтвердите MAIL_FROM (или SMTP_USER) в личном кабинете Brevo → Senders.',
      });
    }

    throw new ServiceUnavailableException({
      ok: false,
      message: 'Не удалось отправить письмо через Brevo. Попробуйте позже.',
    });
  }

  private async sendViaSmtp(payload: MailPayload): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'Почтовый сервис не настроен. Свяжитесь с администратором сайта.',
      });
    }

    try {
      await transporter.verify();
    } catch (error) {
      this.handleSmtpError(error);
    }

    const from = `"${payload.fromName}" <${payload.fromEmail}>`;

    try {
      await transporter.sendMail({
        from,
        to: payload.ownerEmail,
        replyTo: payload.userEmail,
        subject: payload.subjectOwner,
        html: payload.ownerHtml,
        text: payload.ownerText,
      });

      await transporter.sendMail({
        from,
        to: payload.userEmail,
        subject: payload.subjectUser,
        html: payload.userHtml,
        text: payload.userText,
      });
    } catch (error) {
      this.handleSmtpError(error);
    }
  }

  async sendContactEmails(data: ContactPayload): Promise<void> {
    const ownerEmail = this.config.get<string>('OWNER_EMAIL')?.trim();
    const fromEmail = this.resolveFromEmail();
    const brevoKey = this.config.get<string>('BREVO_API_KEY')?.trim();

    if (!ownerEmail || !fromEmail) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'Почтовый сервис не настроен. Укажите OWNER_EMAIL и SMTP_USER (или MAIL_FROM).',
      });
    }

    const payload = this.buildMailPayload(data, ownerEmail, fromEmail);

    if (brevoKey) {
      try {
        await sendViaBrevo(brevoKey, payload);
      } catch (error) {
        this.handleBrevoError(error);
      }
      return;
    }

    await this.sendViaSmtp(payload);
  }
}
