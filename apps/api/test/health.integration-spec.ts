import { afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

async function createApp(prisma?: unknown): Promise<INestApplication<Server>> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (prisma) builder.overrideProvider(PrismaService).useValue(prisma);
  const app = (await builder.compile()).createNestApplication<
    INestApplication<Server>
  >();
  await app.init();
  return app;
}

describe('GET /health (integration)', () => {
  let app: INestApplication<Server>;

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  // Uses the real PrismaService, so it needs the compose Postgres
  // (DATABASE_URL in vitest.config.integration.mts).
  it('returns 200 when the database is reachable', async () => {
    app = await createApp();

    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' } },
    });
  });

  it('returns 503 with the generic error body when the database is down', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const dbDown = () =>
      Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:5432'));
    app = await createApp({
      $runCommandRaw: dbDown,
      $queryRawUnsafe: dbDown,
    });

    const res = await request(app.getHttpServer()).get('/health').expect(503);

    // Nothing about the failed check or its cause reaches the client.
    expect(res.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });
});
