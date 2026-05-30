import {
  normalizeOpenAiBaseUrl,
  PROXYAPI_OPENAI_BASE,
} from './openai-client.factory';

describe('openai-client.factory', () => {
  it('normalizes ProxyAPI base URL', () => {
    expect(normalizeOpenAiBaseUrl('https://api.proxyapi.ru/openai/v1')).toBe(
      PROXYAPI_OPENAI_BASE,
    );
    expect(normalizeOpenAiBaseUrl('https://api.proxyapi.ru/openai')).toBe(
      PROXYAPI_OPENAI_BASE,
    );
    expect(normalizeOpenAiBaseUrl('https://api.proxyapi.ru')).toBe(
      PROXYAPI_OPENAI_BASE,
    );
  });

  it('keeps /v1 suffix for custom mirrors', () => {
    expect(normalizeOpenAiBaseUrl('http://example.com/v1')).toBe(
      'http://example.com/v1',
    );
  });
});
