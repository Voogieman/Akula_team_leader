import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: ZodSchema,
    private readonly message = 'Проверьте правильность полей',
  ) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        ok: false,
        message: this.message,
        errors: result.error.flatten().fieldErrors,
      });
    }

    return result.data;
  }
}
