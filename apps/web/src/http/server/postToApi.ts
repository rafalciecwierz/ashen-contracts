import 'server-only';
import { isApiErrorCode } from '@ashen-contracts/shared';
import { getServerEnv } from '@/config/serverEnv';
import { toErrorCode, type ErrorCode } from '@/i18n/errorCode';
import { bffHeaders } from './bffHeaders';

export type ApiResult<TData> =
  { ok: true; data: TData } | { ok: false; error: { code: ErrorCode } };

/**
 * Sends a Server Action's request to the API: POSTs `body` as JSON to
 * `API_URL` + path, with `bffHeaders`. Never throws for a failed call:
 * the action gets the API's error code, so it can return it to its form.
 * When the API can't be reached, or answers with something that isn't JSON
 * (a platform error page), the code is `INTERNAL_ERROR`; when the error body
 * has no code this build knows (an API deployed ahead of the web app), it is
 * `GENERIC`. The cause goes to the server log either way.
 */
export async function postToApi<TData>(
  path: string,
  body: unknown,
): Promise<ApiResult<TData>> {
  const url = `${getServerEnv().API_URL}${path}`;

  let res: Response;
  let text: string;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: await bffHeaders(),
      body: JSON.stringify(body),
    });
    text = await res.text();
  } catch (error) {
    console.error(`BFF: request to ${url} failed`, error);
    return internalError();
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(
      `BFF: ${url} answered ${res.status} with a body that isn't JSON: ${text.slice(0, 200)}`,
    );
    return internalError();
  }

  if (!res.ok) {
    const code = isRecord(data) ? data.code : undefined;
    if (!isApiErrorCode(code)) {
      console.error(
        `BFF: ${url} answered ${res.status} with an unknown error code: ${text.slice(0, 200)}`,
      );
    }
    return { ok: false, error: { code: toErrorCode(code) } };
  }
  return { ok: true, data: data as TData };
}

function internalError(): ApiResult<never> {
  return { ok: false, error: { code: 'INTERNAL_ERROR' } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
