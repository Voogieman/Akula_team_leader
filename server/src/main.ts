import 'reflect-metadata';
import dns from 'dns';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

dns.setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new ApiExceptionFilter());
  app.setGlobalPrefix('api');

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    app.enableCors({ origin: 'http://localhost:5173' });
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`API: http://localhost:${port}`);
}

bootstrap();
