import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import type { ContactPayload } from '../schemas/contact.schema';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly mailService: MailService) {}

  async submit(data: ContactPayload) {
    try {
      await this.mailService.sendContactEmails(data);
      return {
        ok: true,
        message: 'Сообщение отправлено. Копия письма придёт на ваш email.',
      };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'getStatus' in error &&
        typeof (error as { getStatus: () => number }).getStatus === 'function'
      ) {
        throw error;
      }
      this.logger.error(error);
      throw new InternalServerErrorException({
        ok: false,
        message: 'Не удалось отправить сообщение. Попробуйте позже.',
      });
    }
  }
}
