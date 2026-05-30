import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { AiService } from './ai.service';

jest.mock('openai');

const mockCreate = jest.fn();

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }) as unknown as OpenAI,
    );

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [AiService],
    }).compile();

    service = moduleRef.get(AiService);
  });

  it('throws 503 when OPENAI_API_KEY is missing', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await expect(
      service.generateSummary({ topic: 'NestJS' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    process.env.OPENAI_API_KEY = prev;
  });

  it('returns summary on success', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '  Краткий ответ.  ' } }],
    });

    const result = await service.generateSummary({ topic: 'TypeScript' });

    expect(result).toEqual({ ok: true, summary: 'Краткий ответ.' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: expect.stringContaining('TypeScript') }),
        ]),
      }),
    );
  });

  it('throws 503 on region block (403)', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockCreate.mockRejectedValue({
      status: 403,
      message: 'Country, region, or territory not supported',
    });

    try {
      await service.generateSummary({ topic: 'NestJS' });
      fail('expected ServiceUnavailableException');
    } catch (e) {
      expect(e).toBeInstanceOf(ServiceUnavailableException);
      const body = (e as ServiceUnavailableException).getResponse() as {
        message: string;
      };
      expect(body.message).toContain('ProxyAPI');
    }
  });

  it('throws 503 on invalid API key (401)', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockCreate.mockRejectedValue({
      status: 401,
      message: 'Incorrect API key provided',
    });

    try {
      await service.generateSummary({ topic: 'NestJS' });
      fail('expected ServiceUnavailableException');
    } catch (e) {
      expect(e).toBeInstanceOf(ServiceUnavailableException);
      const body = (e as ServiceUnavailableException).getResponse() as {
        message: string;
      };
      expect(body.message).toContain('OPENAI_API_KEY');
    }
  });

  it('throws 500 on empty AI response', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '' } }] });

    await expect(
      service.generateSummary({ topic: 'NestJS' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
