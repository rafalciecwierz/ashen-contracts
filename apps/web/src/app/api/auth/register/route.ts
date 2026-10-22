import { ApiEndpoints } from '@/http';
import { bffHeaders } from '@/http/bffHeaders';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${API_URL}${ApiEndpoints.auth.register}`, {
    method: 'POST',
    headers: bffHeaders(request),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
