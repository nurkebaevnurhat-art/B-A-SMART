export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { fields?: Record<string, string>; [k: string]: unknown },
  ) {
    super(message);
  }
}

/** Обращение к REST API /api/v1 из браузера */
export async function api<T = unknown>(path: string, init: Omit<RequestInit, "body"> & { body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: "same-origin",
  });
  let json: { data?: T; error?: { code: string; message: string; details?: ApiError["details"] } } = {};
  try {
    json = await res.json();
  } catch {
    /* пустой ответ */
  }
  if (!res.ok || json.error) {
    throw new ApiError(res.status, json.error?.code ?? "INTERNAL", json.error?.message ?? "Ошибка сети. Попробуйте ещё раз.", json.error?.details);
  }
  return json.data as T;
}
