import { ApiEndpoints, proxyToApi } from '@/http/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return proxyToApi(request, ApiEndpoints.auth.register);
}
