import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { Env } from '../config/env.schema';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<Env, true>) {
    const adapter = new PrismaPg({
      connectionString: config.get('DATABASE_URL', { infer: true }),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  // Runs on app.close() and, with enableShutdownHooks() in main.ts, on SIGTERM/SIGINT,
  // so the pg connection pool is released instead of being cut off mid-query.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
