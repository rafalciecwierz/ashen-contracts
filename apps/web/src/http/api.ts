import { AuthErrorCode } from "@ashen-contracts/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: AuthErrorCode | undefined,
    message: string,
  ) {
    super(message);
  }
}

export async function apiPost<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const rawMessage = data?.message;
    const code = data?.code;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(' ')
      : (rawMessage ?? 'Something went wrong. Please try again.');
    throw new ApiError(res.status, code, message);
  }

  return res.json();
}