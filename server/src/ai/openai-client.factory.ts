import { ConfigService } from '@nestjs/config';
import { HttpsProxyAgent } from 'https-proxy-agent';
import OpenAI from 'openai';

/** ProxyAPI — доступ к OpenAI из РФ: https://proxyapi.ru */
export const PROXYAPI_OPENAI_BASE = 'https://api.proxyapi.ru/openai/v1';

/** host:port → http://host:port (опционально, не для ProxyAPI) */
export function normalizeProxyUrl(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(trimmed)) {
    return `http://${trimmed}`;
  }

  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('socks')
  ) {
    return `http://${trimmed}`;
  }

  return trimmed;
}

export function normalizeOpenAiBaseUrl(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.includes('proxyapi.ru')) {
    if (trimmed.endsWith('/openai/v1')) {
      return trimmed;
    }
    if (trimmed.endsWith('/openai')) {
      return `${trimmed}/v1`;
    }
    return PROXYAPI_OPENAI_BASE;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(trimmed)) {
    return `http://${trimmed}/v1`;
  }

  if (/^https?:\/\/[^/]+$/.test(trimmed)) {
    return `${trimmed}/v1`;
  }

  return trimmed;
}

export function createOpenAiClient(config: ConfigService): OpenAI {
  const apiKey = config.get<string>('OPENAI_API_KEY')?.trim() ?? '';
  const baseURL =
    normalizeOpenAiBaseUrl(config.get<string>('OPENAI_BASE_URL')) ??
    undefined;
  const proxyUrl = normalizeProxyUrl(config.get<string>('OPENAI_PROXY'));

  const options: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey,
    baseURL,
    timeout: 45_000,
    maxRetries: 1,
  };

  // HTTP-прокси — только без ProxyAPI base URL
  if (proxyUrl && !baseURL?.includes('proxyapi.ru')) {
    options.httpAgent = new HttpsProxyAgent(proxyUrl);
  }

  return new OpenAI(options);
}
