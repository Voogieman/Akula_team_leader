export type ApiErrorBody = {
  ok: false;
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiPost<T>(
  path: string,
  payload: unknown,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(
      'Нет связи с сервером. Убедитесь, что backend запущен (npm run dev).',
      0,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('Сервер вернул некорректный ответ', response.status);
  }

  if (!response.ok) {
    const body = data as ApiErrorBody;
    let message = body?.message ?? 'Ошибка запроса';

    if (response.status === 429) {
      message = body?.message ?? 'Слишком много запросов. Подождите немного.';
    }

    throw new ApiError(message, response.status, body);
  }

  return data as T;
}
