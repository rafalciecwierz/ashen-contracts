import { afterEach, describe, it } from 'vitest';
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

  it.each(['production', 'test'] as const)(
    'returns 404 for /api in %s',
    async (nodeEnv) => {
      await createApp(nodeEnv);
      await request(app.getHttpServer()).get('/api').expect(404);
    },
  );
});
