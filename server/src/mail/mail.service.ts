import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { ContactPayload } from '../schemas/contact.schema';
import {
  sendViaUnisenderHttp,
  type ContactMailContent,
} from './unisender-http.sender';

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
    if (mailFrom) return mailFrom;

    const sandboxDomain = this.config.get<string>('UNISENDER_SANDBOX_DOMAIN')?.trim();
    if (sandboxDomain) {
      const localPart =
        this.config.get<string>('UNISENDER_SANDBOX_LOCAL')?.trim() || 'test';
      return `${localPart}@${sandboxDomain}`;
    }

    const ownerEmail = this.config.get<string>('OWNER_EMAIL')?.trim();
    const smtpUser = this.config.get<string>('SMTP_USER')?.trim();

    if (ownerEmail) return ownerEmail;
    if (smtpUser?.includes('@')) return smtpUser;
    return null;
  }

  private isSandboxMode(): boolean {
    return Boolean(this.config.get<string>('UNISENDER_SANDBOX_DOMAIN')?.trim());
  }

  private resolveUnisenderApiUrl(): string {
    const host = this.config.get<string>('SMTP_HOST')?.trim() ?? '';
    if (host.includes('go2.')) {
      return 'https://go2.unisender.ru/ru/transactional/api/v1';
    }
    if (host.includes('go1.')) {
      return 'https://go1.unisender.ru/ru/transactional/api/v1';
    }
    return 'https://goapi.unisender.ru/ru/transactional/api/v1';
  }

  private buildMailContent(
    data: ContactPayload,
    ownerEmail: string,
    fromEmail: string,
  ): ContactMailContent {
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

  private resolveSmtpOptions(): SMTPTransport.Options | null {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();

    if (!host || !user || !pass) return null;

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
      tls: { minVersion: 'TLSv1.2', servername: host },
    };
  }

  private handleSmtpError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(message);

    if (
      message.includes('ETIMEDOUT') ||
      message.includes('ECONNREFUSED') ||
      message.includes('timeout')
    ) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'Не удалось подключиться к SMTP. На Render Free порт 587 заблокирован — используйте деплой с HTTP API или тариф Starter.',
      });
    }

    if (
      message.includes('authentication failed') ||
      message.includes('535')
    ) {
      throw new ServiceUnavailableException({
        ok: false,
        message: 'Ошибка входа в SMTP. Проверьте SMTP_USER и SMTP_PASS в Unisender Go.',
      });
    }

    throw new ServiceUnavailableException({
      ok: false,
      message: 'Не удалось отправить письмо. Проверьте SMTP-настройки.',
    });
  }

  private handleUnisenderHttpError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(message);

    if (message.includes('401') || message.includes('403')) {
      if (message.includes('domain') || message.includes('backend')) {
        const sandboxHint = this.isSandboxMode()
          ? ' Укажите MAIL_FROM=test@ваш-sandbox.unigosendbox.com.'
          : '';
        throw new ServiceUnavailableException({
          ok: false,
          message: `Подтвердите отправителя (MAIL_FROM) в Unisender Go.${sandboxHint}`,
        });
      }
      throw new ServiceUnavailableException({
        ok: false,
        message: 'Неверный SMTP_PASS / API-ключ Unisender Go.',
      });
    }

    if (
      message.includes('recipient') ||
      message.includes('not verified') ||
      message.includes('not allowed')
    ) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'Sandbox: получатель не подтверждён. Добавьте email в Unisender Go → Подтверждённые email-адреса.',
      });
    }

    throw new ServiceUnavailableException({
      ok: false,
      message: 'Не удалось отправить письмо через Unisender Go.',
    });
  }

  private async sendViaSmtp(content: ContactMailContent): Promise<void> {
    const transporter = nodemailer.createTransport(this.resolveSmtpOptions()!);
    const from = `"${content.fromName}" <${content.fromEmail}>`;

    this.logger.log(`Mail transport: SMTP (${this.config.get('SMTP_HOST')})`);

    await transporter.verify();

    await transporter.sendMail({
      from,
      to: content.ownerEmail,
      replyTo: content.userEmail,
      subject: content.subjectOwner,
      html: content.ownerHtml,
      text: content.ownerText,
    });

    await transporter.sendMail({
      from,
      to: content.userEmail,
      subject: content.subjectUser,
      html: content.userHtml,
      text: content.userText,
    });
  }

  private async sendViaUnisenderApi(content: ContactMailContent): Promise<void> {
    const apiKey = this.config.get<string>('SMTP_PASS')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException({
        ok: false,
        message: 'Задайте SMTP_PASS (пароль Unisender Go) в Environment на Render.',
      });
    }

    this.logger.log(
      this.isSandboxMode()
        ? `Mail transport: Unisender Go HTTP API (sandbox: ${content.fromEmail})`
        : 'Mail transport: Unisender Go HTTP API (Render — SMTP порт 587 заблокирован)',
    );

    await sendViaUnisenderHttp(apiKey, this.resolveUnisenderApiUrl(), content);
  }

  async sendContactEmails(data: ContactPayload): Promise<void> {
    const ownerEmail = this.config.get<string>('OWNER_EMAIL')?.trim();
    const fromEmail = this.resolveFromEmail();

    if (!ownerEmail || !fromEmail || !this.resolveSmtpOptions()) {
      throw new ServiceUnavailableException({
        ok: false,
        message: 'Почтовый сервис не настроен. Укажите SMTP_*, MAIL_FROM и OWNER_EMAIL.',
      });
    }

    const content = this.buildMailContent(data, ownerEmail, fromEmail);

    // Render Free блокирует SMTP; sandbox на Render — только HTTP API
    if (process.env.RENDER || this.isSandboxMode()) {
      try {
        await this.sendViaUnisenderApi(content);
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        this.handleUnisenderHttpError(error);
      }
      return;
    }

    try {
      await this.sendViaSmtp(content);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.handleSmtpError(error);
    }
  }
}
