import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postToApi } from './postToApi';

vi.mock('@/config/serverEnv', () => ({
  getServerEnv: () => ({ API_URL: 'http://api.test' }),
}));
vi.mock('./bffHeaders', () => ({
  bffHeaders: async () => ({ 'Content-Type': 'application/json' }),
}));

const fetchMock = vi.fn<typeof fetch>();

function respond(status: number, body: string): void {
  fetchMock.mockResolvedValue(new Response(body, { status }));
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe('postToApi', () => {
  it('POSTs the body as JSON to API_URL + path with the BFF headers', async () => {
    respond(200, '{}');

    await postToApi('/auth/login', { email: 'a@b.co' });

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":"a@b.co"}',
    });
  });

  it('returns the data of a successful response', async () => {
    respond(201, '{"id":"1","email":"a@b.co"}');

    await expect(postToApi('/auth/register', {})).resolves.toEqual({
      ok: true,
      data: { id: '1', email: 'a@b.co' },
    });
  });

  it("passes a known error code through and doesn't log it", async () => {
    respond(401, '{"code":"INVALID_CREDENTIALS","message":"Nope"}');

    await expect(postToApi('/auth/login', {})).resolves.toEqual({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS' },
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown code', '{"code":"SOMETHING_NEW"}'],
    ['no code', '{"message":"Nope"}'],
    ['a JSON body that is not an object', '"Bad Request"'],
    ['a null body', 'null'],
  ])('returns GENERIC for an error with %s, and logs it', async (_, body) => {
    respond(400, body);

    await expect(postToApi('/auth/login', {})).resolves.toEqual({
      ok: false,
      error: { code: 'GENERIC' },
    });
    expect(console.error).toHaveBeenCalledOnce();
  });

  it.each([400, 502])(
    'returns INTERNAL_ERROR for a %i body that is not JSON, and logs it',
    async (status) => {
      respond(status, '<html>Bad Gateway</html>');

      await expect(postToApi('/auth/login', {})).resolves.toEqual({
        ok: false,
        error: { code: 'INTERNAL_ERROR' },
      });
      expect(console.error).toHaveBeenCalledOnce();
    },
  );

  it('returns INTERNAL_ERROR when the API cannot be reached, and logs it', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(postToApi('/auth/login', {})).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
    expect(console.error).toHaveBeenCalledOnce();
  });
});
