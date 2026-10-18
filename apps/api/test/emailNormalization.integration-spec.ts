import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

type StoredPlayer = { id: string; email: string; passwordHash: string };

// In-memory stand-in for the two Prisma calls AuthService makes. Lookups are
// exact and case-sensitive, like the unique index on Player.email, so these
// tests pass only if the DTOs normalize the email before it reaches the service.
function createFakePrisma() {
  const players = new Map<string, StoredPlayer>();
  return {
    player: {
      findUnique: ({ where }: { where: { email: string } }) =>
        Promise.resolve(players.get(where.email) ?? null),
      create: ({ data }: { data: Omit<StoredPlayer, 'id'> }) => {
        const player = { id: `player-${players.size + 1}`, ...data };
        players.set(player.email, player);
        return Promise.resolve(player);
      },
    },
  };
}

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
