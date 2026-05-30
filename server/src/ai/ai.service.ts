import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mapOpenAiError } from './ai.errors';
import { createOpenAiClient } from './openai-client.factory';
import type { AiSummaryPayload } from '../schemas/ai.schema';

const SYSTEM_PROMPT = `Ты помощник на лендинге Node.js-разработчика Вугара Гулиева.
Кратко (2–4 предложения, до 400 символов) объясни тему простым языком для потенциального заказчика или работодателя.
Пиши по-русски, без markdown и списков.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {}

  async generateSummary(payload: AiSummaryPayload): Promise<{ ok: true; summary: string }> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException({
        ok: false,
        message:
          'AI-сервис не настроен. Укажите OPENAI_API_KEY (ключ ProxyAPI) в .env.',
      });
    }

    const baseURL = this.config.get<string>('OPENAI_BASE_URL')?.trim();
    this.logger.log(
      `OpenAI endpoint: ${baseURL || 'https://api.openai.com/v1 (direct)'}`,
    );

    try {
      const client = createOpenAiClient(this.config);
      const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';

      const completion = await client.chat.completions.create({
        model,
        temperature: 0.6,
        max_tokens: 220,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Кратко объясни тему: «${payload.topic}»`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim();

      if (!text) {
        throw new Error('AI_EMPTY_RESPONSE');
      }

      return { ok: true, summary: text };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error instanceof Error && error.message === 'AI_EMPTY_RESPONSE') {
        this.logger.warn('OpenAI returned empty content');
        throw new InternalServerErrorException({
          ok: false,
          message: 'AI вернул пустой ответ. Попробуйте другую тему.',
        });
      }

      this.logger.error(error);
      throw mapOpenAiError(error);
    }
  }
}
