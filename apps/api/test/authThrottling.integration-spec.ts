import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { createFakePrisma } from './fakePrisma';

// Must match BFF_SECRET in vitest.config.integration.mts.
const BFF_SECRET = 'integration-test-bff-secret-not-used-elsewhere';

const credentials = (email: string) => ({ email, password: 'password123' });

// Every request in a test comes from the same socket (127.0.0.1), so without
// trusted headers they all share one per-IP bucket. A new app per test gives
// fresh in-memory counters.
describe('Auth rate limiting (integration)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createFakePrisma())
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const login = (email: string, headers: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .set(headers)
      .send(credentials(email));

  const viaBff = (clientIp: string) => ({
    'X-BFF-Secret': BFF_SECRET,
    'X-Client-IP': clientIp,
  });

  describe('POST /auth/login per IP (5 per minute)', () => {
    it('returns 429 with a code and Retry-After on the 6th attempt', async () => {
      for (let i = 0; i < 5; i++) {
        await login(`player${i}@example.com`).expect(401);
      }

      const res = await login('player5@example.com').expect(429);

      expect(res.body).toMatchObject({ code: 'TOO_MANY_REQUESTS' });
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('ignores a made-up X-Client-IP without the BFF secret', async () => {
      for (let i = 0; i < 5; i++) {
        await login(`player${i}@example.com`, {
          'X-Client-IP': `198.51.100.${i}`,
        }).expect(401);
      }

      await login('player5@example.com', {
        'X-Client-IP': '198.51.100.5',
      }).expect(429);
    });

    it('ignores X-Client-IP with a wrong BFF secret', async () => {
      const forged = (i: number) => ({
        'X-BFF-Secret': 'x'.repeat(BFF_SECRET.length),
        'X-Client-IP': `198.51.100.${i}`,
      });
      for (let i = 0; i < 5; i++) {
        await login(`player${i}@example.com`, forged(i)).expect(401);
      }

      await login('player5@example.com', forged(5)).expect(429);
    });

    it('counts players behind the BFF separately', async () => {
      for (let i = 0; i < 5; i++) {
        await login(`a${i}@example.com`, viaBff('203.0.113.1')).expect(401);
      }

      await login('b@example.com', viaBff('203.0.113.2')).expect(401);
      await login('a5@example.com', viaBff('203.0.113.1')).expect(429);
    });

    it('takes req.ip from the proxy entry with TRUST_PROXY_HOPS=1', async () => {
      // What main.ts does behind the Railway/Render proxy. The client controls
      // the left part of X-Forwarded-For; the proxy appends the real address.
      app.set('trust proxy', 1);
      const forwardedFor = (i: number) => ({
        'X-Forwarded-For': `198.51.100.${i}, 203.0.113.9`,
      });
      for (let i = 0; i < 5; i++) {
        await login(`player${i}@example.com`, forwardedFor(i)).expect(401);
      }

      await login('player5@example.com', forwardedFor(5)).expect(429);
    });
  });

  describe('POST /auth/login per email (10 per 15 minutes)', () => {
    it('returns 429 on the 11th attempt for one account from any IP', async () => {
      // Case variants count as one account: the tracker normalizes the email
      // like the DTO does.
      for (let i = 0; i < 10; i++) {
        const email = i % 2 ? 'victim@example.com' : ' Victim@Example.com';
        await login(email, viaBff(`203.0.113.${i}`)).expect(401);
      }

      const res = await login(
        'victim@example.com',
        viaBff('203.0.113.10'),
      ).expect(429);
      expect(res.body).toMatchObject({ code: 'TOO_MANY_REQUESTS' });
    });
  });

  describe('POST /auth/register per IP (3 per hour)', () => {
    it('returns 429 on the 4th registration', async () => {
      const register = (i: number) =>
        request(app.getHttpServer())
          .post('/auth/register')
          .send(credentials(`new${i}@example.com`));

      for (let i = 0; i < 3; i++) {
        await register(i).expect(201);
      }

      const res = await register(3).expect(429);
      expect(res.body).toMatchObject({ code: 'TOO_MANY_REQUESTS' });
    });

    it('does not count logins against the register limit', async () => {
      for (let i = 0; i < 5; i++) {
        await login(`player${i}@example.com`).expect(401);
      }

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials('new@example.com'))
        .expect(201);
    });
  });
});
