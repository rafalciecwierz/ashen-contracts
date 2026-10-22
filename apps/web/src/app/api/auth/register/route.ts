import { ApiEndpoints } from '@/http';
import { proxyToApi } from '@/http/proxyToApi';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return proxyToApi(request, ApiEndpoints.auth.register);
}
