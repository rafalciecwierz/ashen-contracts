import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { createFakePrisma } from './fakePrisma';

// Every error response is { code, message, details? } (ApiErrorResponse),
// whichever layer produced it: a guard, the router, the body parser, or an
// unexpected exception (ApiExceptionFilter, an APP_FILTER in AppModule).
describe('Error contract (integration)', () => {
  let app: INestApplication<Server>;
  let prisma: ReturnType<typeof createFakePrisma>;

  beforeEach(async () => {
    prisma = createFakePrisma();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  const signToken = (options: { expiresIn: number }) =>
    app
      .get(JwtService)
      .signAsync({ sub: 'player-1', email: 'player@example.com' }, options);

  describe('GET /auth/me', () => {
    it('returns UNAUTHORIZED without a token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      expect(res.body).toEqual({
        code: 'UNAUTHORIZED',
        message: 'Missing token',
      });
    });

    it('returns UNAUTHORIZED for a malformed token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);

      expect(res.body).toEqual({
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
      });
    });

    it('returns SESSION_EXPIRED for an expired token', async () => {
      const token = await signToken({ expiresIn: -60 });

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(res.body).toEqual({
        code: 'SESSION_EXPIRED',
        message: 'Token expired',
      });
    });

    it('returns UNAUTHORIZED for a valid token of an account that no longer exists', async () => {
      const token = await signToken({ expiresIn: 60 });

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  it('returns NOT_FOUND for an unknown route', async () => {
    const res = await request(app.getHttpServer())
      .get('/no-such-route')
      .expect(404);

    expect(res.body).toEqual({
      code: 'NOT_FOUND',
      message: 'Cannot GET /no-such-route',
    });
  });

  it('returns BAD_REQUEST for a body that is not valid JSON', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);

    expect(res.body).toEqual({
      code: 'BAD_REQUEST',
      message: expect.any(String) as unknown,
    });
  });

  it('returns INTERNAL_ERROR without internals for an unexpected exception', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    vi.spyOn(prisma.player, 'findUnique').mockRejectedValue(
      new Error('connect ECONNREFUSED 10.0.0.5:5432'),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'player@example.com', password: 'password123' })
      .expect(500);

    expect(res.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
    expect(logError).toHaveBeenCalledOnce();
  });
});
