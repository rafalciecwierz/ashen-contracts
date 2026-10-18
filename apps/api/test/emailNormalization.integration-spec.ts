import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { createFakePrisma } from './fakePrisma';

describe('Email normalization (integration)', () => {
  let app: INestApplication<Server>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createFakePrisma())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('stores the email trimmed and lowercased', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ' Test@X.com ', password: 'password123' })
      .expect(201);

    expect(res.body).toMatchObject({ email: 'test@x.com' });
  });

  it('logs in with a differently cased email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'Test@X.com', password: 'password123' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@x.com', password: 'password123' })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
  });

  it('rejects a second registration that differs only in case', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@x.com', password: 'password123' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'TEST@x.com', password: 'password123' })
      .expect(409);

    expect(res.body).toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });
  });
});
