import { apiPost, ApiError } from '../api/client';

type AiResponse = {
  ok: true;
  summary: string;
};

function setAiLoading(loading: boolean): void {
  const btn = document.querySelector<HTMLButtonElement>('#ai-submit');
  if (!btn) return;
  btn.disabled = loading;
  const text = btn.querySelector('.btn__text');
  const loader = btn.querySelector('.btn__loader');
  if (text) text.toggleAttribute('hidden', loading);
  if (loader) loader.toggleAttribute('hidden', !loading);
}

function showAiAlert(type: 'success' | 'error', message: string): void {
  const alert = document.querySelector<HTMLElement>('#ai-alert');
  if (!alert) return;
  alert.hidden = false;
  alert.className = `alert alert--${type}`;
  alert.textContent = message;
}

function hideAiAlert(): void {
  const alert = document.querySelector<HTMLElement>('#ai-alert');
  if (!alert) return;
  alert.hidden = true;
  alert.textContent = '';
}

function showAiResult(text: string): void {
  const block = document.querySelector<HTMLElement>('#ai-result');
  const paragraph = document.querySelector<HTMLElement>('#ai-result-text');
  if (!block || !paragraph) return;
  paragraph.textContent = text;
  block.hidden = false;
}

function hideAiResult(): void {
  const block = document.querySelector<HTMLElement>('#ai-result');
  if (block) block.hidden = true;
}

export function initAiHelper(): void {
  const form = document.querySelector<HTMLFormElement>('#ai-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAiAlert();
    hideAiResult();

    const input = form.querySelector<HTMLInputElement>('#ai-topic');
    if (!input) return;

    if (!input.validity.valid) {
      showAiAlert('error', input.validationMessage || 'Укажите тему');
      return;
    }

    const topic = input.value.trim();
    setAiLoading(true);

    try {
      const res = await apiPost<AiResponse>('/api/ai/summary', { topic });
      showAiResult(res.summary);
      showAiAlert('success', 'Готово — ответ сгенерирован.');
    } catch (err) {
      let message = 'Ошибка AI-сервиса';
      if (err instanceof ApiError) {
        message = err.message;
        if (err.body?.errors?.topic?.[0]) {
          message = err.body.errors.topic[0];
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      showAiAlert('error', message);
      hideAiResult();
    } finally {
      setAiLoading(false);
    }
  });
}
