import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { aiSummarySchema, type AiSummaryPayload } from '../schemas/ai.schema';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('summary')
  summary(
    @Body(new ZodValidationPipe(aiSummarySchema, 'Укажите корректную тему'))
    body: AiSummaryPayload,
  ) {
    return this.aiService.generateSummary(body);
  }
}
