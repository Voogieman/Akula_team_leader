import {
  HttpException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

export function isRegionBlocked(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const err = error as { status?: number; message?: string; code?: string };
  const text = `${err.message ?? ''} ${err.code ?? ''}`.toLowerCase();
  return (
    err.status === 403 ||
    text.includes('country') ||
    text.includes('region') ||
    text.includes('territory not supported')
  );
}

export function mapOpenAiError(error: unknown): HttpException {
  if (isRegionBlocked(error)) {
    return new ServiceUnavailableException({
      ok: false,
      message:
        'OpenAI недоступен напрямую из РФ. Используйте ProxyAPI: OPENAI_BASE_URL=https://api.proxyapi.ru/openai/v1 и ключ из личного кабинета proxyapi.ru.',
    });
  }

  const err = error as {
    status?: number;
    code?: string;
    message?: string;
  };
  const text = `${err.message ?? ''} ${err.code ?? ''}`;

  if (err.status === 401) {
    return new ServiceUnavailableException({
      ok: false,
      message: 'Неверный OPENAI_API_KEY. Проверьте ключ в .env.',
    });
  }

  if (err.status === 429) {
    return new ServiceUnavailableException({
      ok: false,
      message: 'Превышен лимит запросов OpenAI. Попробуйте через минуту.',
    });
  }

  if (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ENOTFOUND' ||
    err.code === 'ETIMEDOUT' ||
    text.includes('Proxy connection') ||
    text.includes('ECONNRESET')
  ) {
    return new ServiceUnavailableException({
      ok: false,
      message:
        'Не удалось подключиться к OpenAI через прокси. Проверьте OPENAI_PROXY и доступность сервера.',
    });
  }

  return new InternalServerErrorException({
    ok: false,
    message: 'Не удалось получить ответ от AI. Попробуйте позже.',
  });
}
