import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import type { ApiErrorResponse } from '@ashen-contracts/shared';
import { AppModule } from './../src/app.module';

// These requests are rejected by the global ValidationPipe before they reach
// AuthService, so no database is needed. A 400 here proves the pipe is
// registered in AppModule, not only in main.ts (docs/DECISIONS.md #016).
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
            constraint: 'isEmail',
            message: 'email must be an email',
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
          constraint: 'whitelistValidation',
          message: 'property isAdmin should not exist',
        },
      ]);
    });
  });
});
