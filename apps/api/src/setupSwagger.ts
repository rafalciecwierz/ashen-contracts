import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Env } from './config/env.schema';

export function setupSwagger(
  app: INestApplication,
  nodeEnv: Env['NODE_ENV'],
): void {
  if (nodeEnv !== 'development') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Ashen Contracts API')
    .setDescription('API for the Ashen Contracts browser game')
    .setVersion('0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
        description: 'Paste access token without Bearer prefix',
      },
      'Bearer',
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
}
