import 'server-only';
import type { ApiErrorResponse } from '@ashen-contracts/shared';
import { getServerEnv } from '@/config/serverEnv';
import { bffHeaders } from './bffHeaders';

export type ApiResult<TData> =
  { ok: true; data: TData } | { ok: false; error: ApiErrorResponse };

/**
 * Sends a Server Action's request to the API: POSTs `body` as JSON to
 * `API_URL` + path, with `bffHeaders`. Never throws for a failed call:
 * the action gets the API's error body, so it can return the code to its
 * form. When the API can't be reached, or answers with something that isn't
 * JSON (a platform error page), the error is `INTERNAL_ERROR`, and the cause
 * goes to the server log.
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
    return internalError('The game server could not be reached.');
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(
      `BFF: ${url} answered ${res.status} with a body that isn't JSON: ${text.slice(0, 200)}`,
    );
    return internalError('The game server sent an invalid response.');
  }

  if (!res.ok) {
    return { ok: false, error: data as ApiErrorResponse };
  }
  return { ok: true, data: data as TData };
}

function internalError(message: string): ApiResult<never> {
  return { ok: false, error: { code: 'INTERNAL_ERROR', message } };
}
