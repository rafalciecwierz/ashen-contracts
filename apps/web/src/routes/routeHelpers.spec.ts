import { describe, expect, it } from 'vitest';
import { buildPath, getSafeRedirect } from './routeHelpers';

describe('buildPath', () => {
  it('returns the path alone without params', () => {
    expect(buildPath('/login')).toBe('/login');
    expect(buildPath('/login', {})).toBe('/login');
  });

  it('appends encoded query params', () => {
    expect(buildPath('/login', { registered: 'true', next: '/a b&c' })).toBe(
      '/login?registered=true&next=%2Fa+b%26c',
    );
  });
});

describe('getSafeRedirect', () => {
  it.each(['/', '/play', '/play/contracts?id=1#top', '/a//b'])(
    'accepts the in-app path %j',
    (target) => {
      expect(getSafeRedirect(target)).toBe(target);
    },
  );

  it.each([
    '//evil.com',
    '//evil.com/play',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    '/\r\n/evil.com',
    '/\t\\evil.com',
    'https://evil.com',
    'http://localhost/play',
    'javascript:alert(1)',
    'data:text/html,hi',
    'play',
    'evil.com',
    ' /play',
    '',
  ])('rejects %j', (target) => {
    expect(getSafeRedirect(target)).toBeNull();
  });

  it('returns the path as a browser would read it', () => {
    expect(getSafeRedirect('/pl\tay')).toBe('/play');
    expect(getSafeRedirect('/a b')).toBe('/a%20b');
  });

  it('rejects a missing target', () => {
    expect(getSafeRedirect(null)).toBeNull();
    expect(getSafeRedirect(undefined)).toBeNull();
  });
});
