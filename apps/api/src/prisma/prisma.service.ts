import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPostgresAdapter } from '@prisma/adapter-ppg';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPostgresAdapter({
      connectionString: process.env.DATABASE_URL!,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
