import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema';
import { JwtAuthGuard } from './guards/jwtAuth.guard';
import { ThrottlerModule } from '@nestjs/throttler';
import { authThrottlerOptions } from './throttling/authThrottling';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    // Applied only to login and register, through AuthThrottlerGuard.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: authThrottlerOptions,
    }),
  ],
  providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  controllers: [AuthController],
})
export class AuthModule {}
