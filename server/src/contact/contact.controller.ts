import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  contactSchema,
  type ContactPayload,
} from '../schemas/contact.schema';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  submit(
    @Body(
      new ZodValidationPipe(
        contactSchema,
        'Проверьте правильность полей формы',
      ),
    )
    body: ContactPayload,
  ) {
    return this.contactService.submit(body);
  }
}
