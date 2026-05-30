import { apiPost, ApiError, type ApiErrorBody } from '../api/client';

type ContactResponse = {
  ok: true;
  message: string;
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Имя',
  phone: 'Телефон',
  email: 'Email',
  comment: 'Комментарий',
};

function setLoading(form: HTMLFormElement, loading: boolean): void {
  const btn = form.querySelector<HTMLButtonElement>('[type="submit"]');
  if (!btn) return;

  btn.disabled = loading;
  const text = btn.querySelector('.btn__text');
  const loader = btn.querySelector('.btn__loader');

  if (text) text.toggleAttribute('hidden', loading);
  if (loader) loader.toggleAttribute('hidden', !loading);
}

function showAlert(
  el: HTMLElement,
  type: 'success' | 'error',
  message: string,
): void {
  el.hidden = false;
  el.className = `alert alert--${type}`;
  el.textContent = message;
}

function hideAlert(el: HTMLElement): void {
  el.hidden = true;
  el.textContent = '';
}

function clearFieldErrors(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('[data-field]').forEach((wrap) => {
    wrap.classList.remove('field--invalid');
    const err = wrap.querySelector('.field__error');
    if (err) err.textContent = '';
  });
}

function showServerFieldErrors(
  form: HTMLFormElement,
  errors: ApiErrorBody['errors'],
): void {
  if (!errors) return;

  for (const [key, messages] of Object.entries(errors)) {
    const wrap = form.querySelector<HTMLElement>(`[data-field="${key}"]`);
    if (!wrap || !messages?.length) continue;
    wrap.classList.add('field--invalid');
    const err = wrap.querySelector('.field__error');
    if (err) err.textContent = messages[0];
  }
}

function validateClient(form: HTMLFormElement): boolean {
  clearFieldErrors(form);
  let valid = true;

  const fields = ['name', 'phone', 'email', 'comment'] as const;

  for (const name of fields) {
    const input = form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    const wrap = form.querySelector<HTMLElement>(`[data-field="${name}"]`);
    if (!input || !wrap) continue;

    if (!input.validity.valid) {
      valid = false;
      wrap.classList.add('field--invalid');
      const err = wrap.querySelector('.field__error');
      const label = FIELD_LABELS[name] ?? name;
      if (err) {
        err.textContent =
          input.validationMessage || `Проверьте поле «${label}»`;
      }
    }
  }

  return valid;
}

export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('#contact-form');
  const alert = document.querySelector<HTMLElement>('#contact-alert');

  if (!form || !alert) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alert);

    if (!validateClient(form)) {
      showAlert(alert, 'error', 'Исправьте ошибки в форме.');
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      comment: String(formData.get('comment') ?? '').trim(),
    };

    setLoading(form, true);

    try {
      const res = await apiPost<ContactResponse>('/api/contact', payload);
      showAlert(alert, 'success', res.message);
      form.reset();
      clearFieldErrors(form);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось отправить форму';
      showAlert(alert, 'error', message);

      if (err instanceof ApiError) {
        showServerFieldErrors(form, err.body?.errors);
      }
    } finally {
      setLoading(form, false);
    }
  });
}
