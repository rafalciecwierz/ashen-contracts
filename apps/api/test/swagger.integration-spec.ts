import { afterEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { Env } from './../src/config/env.schema';
import { setupSwagger } from './../src/setupSwagger';

describe('Swagger (integration)', () => {
  let app: INestApplication<Server>;

  async function createApp(nodeEnv: Env['NODE_ENV']) {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app, nodeEnv);
    await app.init();
  }

  afterEach(async () => {
    await app.close();
  });

  it('serves the API docs at /api in development', async () => {
    await createApp('development');
    await request(app.getHttpServer()).get('/api').expect(200);
  });

  it('describes request bodies from their Zod schemas', async () => {
    await createApp('development');
    const res = await request(app.getHttpServer()).get('/api-json').expect(200);

    const doc = res.body as {
      paths: Record<string, Record<string, { requestBody?: unknown }>>;
    };
    expect(doc.paths['/auth/register'].post.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
            },
            required: ['email', 'password'],
            additionalProperties: false,
          },
        },
      },
    });
  });

  it.each(['production', 'test'] as const)(
    'returns 404 for /api in %s',
    async (nodeEnv) => {
      await createApp(nodeEnv);
      await request(app.getHttpServer()).get('/api').expect(404);
    },
  );
});
