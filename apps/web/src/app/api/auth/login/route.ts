import type { LoginResponse } from '@ashen-contracts/shared';
import { ApiEndpoints, proxyToApi, setSessionCookie } from '@/http/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return proxyToApi(request, ApiEndpoints.auth.login, async (data) => {
    // The token goes into the httpOnly cookie, never to the browser's JS.
    await setSessionCookie((data as LoginResponse).accessToken);
    return NextResponse.json({ success: true });
  });
}
