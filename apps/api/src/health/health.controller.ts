import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

/**
 * For the hosting platform's health check and uptime monitors: 200 when the
 * API can reach the database, 503 when it can't. A failed check goes through
 * ApiExceptionFilter like any 5xx, so the body is the generic INTERNAL_ERROR
 * and which check failed is only in the server log (docs/DECISIONS.md #018).
 */
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
