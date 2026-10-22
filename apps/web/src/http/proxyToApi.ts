import type { ApiErrorResponse } from '@ashen-contracts/shared';
import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/config/serverEnv';
import { bffHeaders } from './bffHeaders';

type OnSuccess = (
  data: unknown,
  status: number,
) => NextResponse | Promise<NextResponse>;

const passThrough: OnSuccess = (data, status) =>
  NextResponse.json(data, { status });

/**
 * Forwards a route handler's request to the API and answers with the API's
 * status and JSON body. A successful response goes through `onSuccess`
 * instead, e.g. to set the session cookie.
 *
 * The body is forwarded as text, unparsed: invalid JSON from the browser gets
 * the API's own 400 BAD_REQUEST. When the API can't be reached, or answers
 * with something that isn't JSON (a platform error page), the browser gets a
 * 502 with the usual error body, and the cause goes to the server log.
 */
export async function proxyToApi(
  request: NextRequest,
  path: string,
  onSuccess: OnSuccess = passThrough,
): Promise<NextResponse> {
  const url = `${getServerEnv().API_URL}${path}`;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  let res: Response;
  let text: string;
  try {
    res = await fetch(url, {
      method: request.method,
      headers: bffHeaders(request),
      body: hasBody ? await request.text() : undefined,
    });
    text = await res.text();
  } catch (error) {
    console.error(`BFF: request to ${url} failed`, error);
    return badGateway('The game server could not be reached.');
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(
      `BFF: ${url} answered ${res.status} with a body that isn't JSON: ${text.slice(0, 200)}`,
    );
    return badGateway('The game server sent an invalid response.');
  }

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return onSuccess(data, res.status);
}

function badGateway(message: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { code: 'INTERNAL_ERROR', message },
    { status: 502 },
  );
}
