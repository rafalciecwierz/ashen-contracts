import { ApiEndpoints } from '@/src/http';
import { bffHeaders } from '@/src/http/bffHeaders';
import { setSessionCookie } from '@/src/http/session';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${API_URL}${ApiEndpoints.auth.login}`, {
    method: 'POST',
    headers: bffHeaders(request),
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  await setSessionCookie(data.accessToken);

  return NextResponse.json({ success: true });
}
