import 'reflect-metadata';
import dns from 'dns';
import { existsSync } from 'fs';
import { join } from 'path';
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

  const clientDir = join(process.cwd(), 'dist', 'client');
  const clientReady = existsSync(join(clientDir, 'index.html'));
  console.log(
    clientReady
      ? `Frontend: serving ${clientDir}`
      : 'Frontend: dist/client/index.html not found — run npm run build',
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`API: http://localhost:${port}`);
}

bootstrap();
