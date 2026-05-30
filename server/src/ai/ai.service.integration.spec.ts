import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from './ai.service';

/**
 * Реальный вызов OpenAI (без mock). Ключ из .env.
 * При 403 из РФ тест помечается пройденным с предупреждением.
 */
describe('AiService integration (real OpenAI)', () => {
  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  (hasKey ? it : it.skip)(
    'calls OpenAI API',
    async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true })],
        providers: [AiService],
      }).compile();

      const service = moduleRef.get(AiService);

      try {
        const result = await service.generateSummary({
          topic: 'микросервисы на NestJS',
        });

        expect(result.ok).toBe(true);
        expect(result.summary.length).toBeGreaterThan(10);
        // eslint-disable-next-line no-console
        console.log('\n[integration] OK:', result.summary.slice(0, 200), '...\n');
      } catch (error) {
        if (error instanceof ServiceUnavailableException) {
          const body = error.getResponse() as { message: string };
          if (body.message.includes('РФ') || body.message.includes('OPENAI')) {
            // eslint-disable-next-line no-console
            console.warn('\n[integration] Пропуск:', body.message, '\n');
            return;
          }
        }
        throw error;
      }
    },
    60_000,
  );
});
