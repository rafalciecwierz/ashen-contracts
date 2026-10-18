import { describe, expect, it } from 'vitest';
import { resolveClientIp } from './clientIp';

const SECRET = 'a'.repeat(32);
const SOCKET_IP = '10.0.0.5';

function request(headers: Record<string, string | string[]> = {}) {
  return { ip: SOCKET_IP, headers };
}

describe('resolveClientIp', () => {
  it('uses X-Client-IP when the request carries the BFF secret', () => {
    const req = request({
      'x-bff-secret': SECRET,
      'x-client-ip': '83.12.44.7',
    });

    expect(resolveClientIp(req, SECRET)).toBe('83.12.44.7');
  });

  it('ignores X-Client-IP without the BFF secret', () => {
    const req = request({ 'x-client-ip': '83.12.44.7' });

    expect(resolveClientIp(req, SECRET)).toBe(SOCKET_IP);
  });

  it.each([
    ['a wrong secret of the same length', 'b'.repeat(32)],
    ['a shorter secret', 'short'],
    ['an empty secret', ''],
  ])('ignores X-Client-IP with %s', (_case, secret) => {
    const req = request({
      'x-bff-secret': secret,
      'x-client-ip': '83.12.44.7',
    });

    expect(resolveClientIp(req, SECRET)).toBe(SOCKET_IP);
  });

  it('falls back to req.ip when the BFF sends no client IP', () => {
    expect(resolveClientIp(request({ 'x-bff-secret': SECRET }), SECRET)).toBe(
      SOCKET_IP,
    );
  });

  it('falls back to req.ip when X-Client-IP is not an IP address', () => {
    const req = request({ 'x-bff-secret': SECRET, 'x-client-ip': 'not-an-ip' });

    expect(resolveClientIp(req, SECRET)).toBe(SOCKET_IP);
  });

  it('groups IPv6 addresses by their /64 subnet', () => {
    const ip = (host: string) =>
      resolveClientIp(
        request({
          'x-bff-secret': SECRET,
          'x-client-ip': `2001:db8:1:2::${host}`,
        }),
        SECRET,
      );

    expect(ip('1')).toBe(ip('ffff'));
  });
});
