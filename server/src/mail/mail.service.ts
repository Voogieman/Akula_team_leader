import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { ContactPayload } from '../schemas/contact.schema';

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

  private resolveFromEmail(): string | null {
    const mailFrom = this.config.get<string>('MAIL_FROM')?.trim();
    const ownerEmail = this.config.get<string>('OWNER_EMAIL')?.trim();
    const smtpUser = this.config.get<string>('SMTP_USER')?.trim();

    if (mailFrom) {
      return mailFrom;
    }
    if (ownerEmail) {
      return ownerEmail;
    }
    if (smtpUser?.includes('@')) {
      return smtpUser;
    }
    return null;
  }

  private resolveSmtpOptions(): SMTPTransport.Options | null {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();

    if (!host || !user || !pass) {
      return null;
    }

    const port = Number(this.config.get('SMTP_PORT') ?? 587);
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
          'SMTP-сервер не ответил. Unisender Go: SMTP_HOST=smtp.go2.unisender.ru, SMTP_PORT=587, SMTP_SECURE=false.',
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
          'Ошибка входа в SMTP. Проверьте SMTP_USER (логин) и SMTP_PASS в Unisender Go.',
      });
    }

    if (
      message.includes('ETIMEDOUT') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('timeout')
    ) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'Не удалось подключиться к почтовому серверу. Проверьте SMTP_HOST, порт и интернет-соединение.',
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

  async sendContactEmails(data: ContactPayload): Promise<void> {
    const transporter = this.getTransporter();
    const ownerEmail = this.config.get<string>('OWNER_EMAIL')?.trim();
    const fromEmail = this.resolveFromEmail();

    if (!transporter || !ownerEmail || !fromEmail) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'Почтовый сервис не настроен. Укажите SMTP_*, MAIL_FROM и OWNER_EMAIL.',
      });
    }

    try {
      await transporter.verify();
    } catch (error) {
      this.handleSmtpError(error);
    }

    const { name, phone, email, comment } = data;
    const safeName = this.escapeHtml(name);
    const safePhone = this.escapeHtml(phone);
    const safeEmail = this.escapeHtml(email);
    const safeComment = this.escapeHtml(comment).replace(/\n/g, '<br>');

    const ownerHtml = `
      <h2>Новая заявка с сайта</h2>
      <p><strong>Имя:</strong> ${safeName}</p>
      <p><strong>Телефон:</strong> ${safePhone}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Комментарий:</strong></p>
      <p>${safeComment}</p>
    `;

    const userHtml = `
      <h2>Спасибо за обращение, ${safeName}!</h2>
      <p>Мы получили ваше сообщение и свяжемся с вами в ближайшее время.</p>
      <hr>
      <p><strong>Ваши данные:</strong></p>
      <p>Телефон: ${safePhone}</p>
      <p>Email: ${safeEmail}</p>
      <p><strong>Комментарий:</strong></p>
      <p>${safeComment}</p>
    `;

    const from = `"Вугар Гулиев — портфолио" <${fromEmail}>`;

    this.logger.log(`Mail transport: SMTP (${this.config.get('SMTP_HOST')})`);

    try {
      await transporter.sendMail({
        from,
        to: ownerEmail,
        replyTo: email,
        subject: `Новая заявка от ${name}`,
        html: ownerHtml,
        text: `Имя: ${name}\nТелефон: ${phone}\nEmail: ${email}\n\n${comment}`,
      });

      await transporter.sendMail({
        from,
        to: email,
        subject: 'Копия вашего обращения',
        html: userHtml,
        text: `Спасибо, ${name}!\n\nМы получили ваше сообщение.\n\n${comment}`,
      });
    } catch (error) {
      this.handleSmtpError(error);
    }
  }
}
