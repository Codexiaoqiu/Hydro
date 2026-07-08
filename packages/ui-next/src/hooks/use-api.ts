/**
 * `useApi` — fetch-based request layer that mirrors the legacy ui-default
 * `request` module (utils/base.ts). Keeps the same wire conventions:
 *
 *   - `request.post(url, formData)`              → application/x-www-form-urlencoded
 *   - `request.post(url, plainObject)`           → application/json
 *   - `request.postFile(url, FormData)`          → multipart/form-data
 *   - `request.get(url, qs)`                     → query string
 *
 * Errors are normalised into a `HydroError`-shaped object thrown from every
 * call: `{ name, code, message, params, rawMessage, isUserFacingError }`.
 * The `code` is the HTTP status; `message` substitutes `{0}`/`{1}`/… params.
 *
 * CSRF is handled by the framework via `Referer`-based checks
 * (`framework/framework/server.ts::CsrfTokenError`), so same-origin POSTs
 * pass through without an explicit token. We still send cookies via
 * `credentials: 'same-origin'`.
 */
import { useCallback, useRef, useState } from 'react';

export class HydroClientError extends Error {
  name: string;
  /** HTTP status, mirrors HydroError.code for UserFacingError subclasses. */
  code: number;
  /** Substitution parameters from the server-side error. */
  params: unknown[];
  /** The raw `{0}` placeholder string before substitution. */
  rawMessage: string;
  /** True when the server classified the error as user-facing. */
  isUserFacingError: boolean;
  /** True when the request was aborted by the caller. */
  aborted: boolean;

  constructor(opts: {
    name?: string;
    code: number;
    message: string;
    rawMessage?: string;
    params?: unknown[];
    isUserFacingError?: boolean;
    aborted?: boolean;
  }) {
    super(opts.message);
    this.name = opts.name ?? 'HydroError';
    this.code = opts.code;
    this.rawMessage = opts.rawMessage ?? opts.message;
    this.params = opts.params ?? [];
    this.isUserFacingError = !!opts.isUserFacingError;
    this.aborted = !!opts.aborted;
  }
}

export type RequestBody =
  | FormData
  | URLSearchParams
  | Record<string, unknown>
  | string;

export interface RequestOptions {
  /** AbortSignal to cancel the in-flight request. */
  signal?: AbortSignal;
  /** Override the default headers (e.g. add `x-hydro-inject`). */
  headers?: Record<string, string>;
  /** Skip credentials (defaults to `same-origin`). */
  credentials?: RequestCredentials;
  /** Override cache mode (defaults to `no-store` for POSTs). */
  cache?: RequestCache;
}

interface ErrorPayload {
  message: string;
  params?: unknown[];
  stack?: string;
}

function substitute(template: string, params: unknown[]): string {
  return template.replace(/\{(\d+)\}/g, (_, idx) => {
    const v = params[Number(idx)];
    return v === undefined || v === null ? `{${idx}}` : String(v);
  });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !(v instanceof FormData) && !(v instanceof URLSearchParams) && !(v instanceof Array) && !(v instanceof Blob);
}

function buildBody(data: RequestBody, headers: Record<string, string>): BodyInit | null {
  if (data === undefined || data === null) return null;
  if (typeof data === 'string') return data;
  if (data instanceof FormData) return data;
  if (data instanceof URLSearchParams) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/x-www-form-urlencoded;charset=UTF-8';
    return data;
  }
  if (isPlainObject(data)) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json;charset=UTF-8';
    return JSON.stringify(data);
  }
  return data as unknown as BodyInit;
}

async function parseError(res: Response): Promise<HydroClientError> {
  const fallback = new HydroClientError({
    name: 'NetworkError',
    code: res.status,
    message: `${res.status} ${res.statusText || 'Request failed'}`,
    isUserFacingError: false,
  });
  let payload: { error?: ErrorPayload; UserFacingError?: boolean } | null = null;
  try {
    payload = await res.clone().json();
  } catch {
    return fallback;
  }
  if (!payload?.error) return fallback;
  const { message, params = [] } = payload.error;
  const isUserFacing = !!payload.UserFacingError;
  return new HydroClientError({
    name: isUserFacing ? 'UserFacingError' : 'SystemError',
    code: res.status,
    message: substitute(message, params),
    rawMessage: message,
    params,
    isUserFacingError: isUserFacing,
  });
}

interface InternalOptions extends RequestOptions {
  method: 'GET' | 'POST';
}

async function send<T>(url: string, init: InternalOptions, body?: RequestBody): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...init.headers,
  };
  let payload: BodyInit | null = null;
  if (body !== undefined) {
    payload = buildBody(body, headers);
  }
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers,
      body: payload,
      credentials: init.credentials ?? 'same-origin',
      cache: init.cache ?? (init.method === 'GET' ? 'default' : 'no-store'),
      signal: init.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new HydroClientError({ name: 'AbortError', code: 0, message: 'Aborted', aborted: true });
    }
    throw new HydroClientError({
      name: 'NetworkError',
      code: 0,
      message: e instanceof Error ? e.message : 'Network error',
    });
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as unknown as T;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

function appendQuery(url: string, qs: Record<string, unknown> | undefined): string {
  if (!qs) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(qs)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item) => params.append(k, String(item)));
    else params.append(k, String(v));
  }
  const qsString = params.toString();
  if (!qsString) return url;
  return url.includes('?') ? `${url}&${qsString}` : `${url}?${qsString}`;
}

export const request = {
  get<T = unknown>(url: string, qs?: Record<string, unknown>, options: RequestOptions = {}): Promise<T> {
    return send<T>(appendQuery(url, qs), { ...options, method: 'GET' });
  },
  post<T = unknown>(url: string, data: RequestBody, options: RequestOptions = {}): Promise<T> {
    return send<T>(url, { ...options, method: 'POST' }, data);
  },
  postFile<T = unknown>(url: string, form: FormData, options: RequestOptions = {}): Promise<T> {
    const headers = { ...(options.headers ?? {}) };
    delete headers['Content-Type'];
    return send<T>(url, { ...options, headers, method: 'POST' }, form);
  },
};

export interface UseApiResult<TBody = unknown, TResp = unknown> {
  loading: boolean;
  error: HydroClientError | null;
  data: TResp | null;
  post: (body: TBody, options?: RequestOptions) => Promise<TResp>;
  get: (qs?: Record<string, unknown>, options?: RequestOptions) => Promise<TResp>;
  reset: () => void;
  abort: () => void;
}

/**
 * Stateful request helper bound to a single endpoint.
 *
 *   const login = useApi<LoginBody, LoginResp>('/login');
 *   try {
 *     const resp = await login.post({ uname, password, rememberme });
 *   } catch (e) {
 *     if (e instanceof HydroClientError) setError(e);
 *   }
 */
export function useApi<TBody = unknown, TResp = unknown>(url: string): UseApiResult<TBody, TResp> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HydroClientError | null>(null);
  const [data, setData] = useState<TResp | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abort();
    setError(null);
    setData(null);
  }, [abort]);

  const post = useCallback(
    async (body: TBody, options: RequestOptions = {}) => {
      abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const result = await request.post<TResp>(url, body as unknown as RequestBody, {
          ...options,
          signal: controller.signal,
        });
        setData(result);
        return result;
      } catch (e) {
        if (e instanceof HydroClientError) setError(e);
        throw e;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setLoading(false);
      }
    },
    [url, abort],
  );

  const get = useCallback(
    async (qs?: Record<string, unknown>, options: RequestOptions = {}) => {
      abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const result = await request.get<TResp>(url, qs, { ...options, signal: controller.signal });
        setData(result);
        return result;
      } catch (e) {
        if (e instanceof HydroClientError) setError(e);
        throw e;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setLoading(false);
      }
    },
    [url, abort],
  );

  return { loading, error, data, post, get, reset, abort };
}