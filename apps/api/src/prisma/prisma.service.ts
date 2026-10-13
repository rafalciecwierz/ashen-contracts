import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
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
