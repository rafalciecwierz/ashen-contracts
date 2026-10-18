import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Env } from './config/env.schema';
import { setupSwagger } from './setupSwagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();

  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
  });

  app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));

  setupSwagger(app, config.get('NODE_ENV', { infer: true }));

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
