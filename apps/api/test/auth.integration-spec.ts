import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import type { ApiErrorResponse } from '@ashen-contracts/shared';
import { AppModule } from './../src/app.module';

// These requests are rejected by the global validation pipe before they reach
// AuthService, so no database is needed. A 400 here proves the pipe is
// registered in AppModule, not only in main.ts (docs/DECISIONS.md #022).
describe('Auth request validation (integration)', () => {
  let app: INestApplication<Server>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe.each(['/auth/register', '/auth/login'])('POST %s', (path) => {
    it('rejects a body without email', async () => {
      const res = await request(app.getHttpServer())
        .post(path)
        .send({ password: 'password123' })
        .expect(400);

      expect(res.body).toEqual({
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: expect.arrayContaining([
          {
            field: 'email',
            constraint: 'invalid_type',
            message: 'Invalid input: expected string, received undefined',
          },
        ]) as unknown,
      });
    });

    it('rejects a body without password', async () => {
      const res = await request(app.getHttpServer())
        .post(path)
        .send({ email: 'player@example.com' })
        .expect(400);

      const body = res.body as ApiErrorResponse;
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.details?.map((detail) => detail.field)).toContain('password');
    });

    it('rejects unknown fields', async () => {
      const res = await request(app.getHttpServer())
        .post(path)
        .send({
          email: 'player@example.com',
          password: 'password123',
          isAdmin: true,
        })
        .expect(400);

      expect((res.body as ApiErrorResponse).details).toEqual([
        {
          field: 'isAdmin',
          constraint: 'unrecognized_keys',
          message: 'Unrecognized key: "isAdmin"',
        },
      ]);
    });
  });

  it('rejects a registration password shorter than 8 characters', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'player@example.com', password: '1234567' })
      .expect(400);

    expect((res.body as ApiErrorResponse).details).toEqual([
      {
        field: 'password',
        constraint: 'too_small',
        message: 'Too small: expected string to have >=8 characters',
      },
    ]);
  });

  it('rejects an empty login password before checking credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'player@example.com', password: '' })
      .expect(400);

    expect((res.body as ApiErrorResponse).code).toBe('VALIDATION_FAILED');
  });
});
