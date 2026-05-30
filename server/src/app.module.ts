import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { existsSync } from 'fs';
import { join } from 'path';
import { AiModule } from './ai/ai.module';
import { ContactModule } from './contact/contact.module';
import { HealthController } from './health/health.controller';

function resolveClientRoot(): string | null {
  const candidates = [
    join(__dirname, 'client'),
    join(process.cwd(), 'dist', 'client'),
  ];
  return candidates.find((dir) => existsSync(join(dir, 'index.html'))) ?? null;
}

const clientRoot = resolveClientRoot();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 15 * 60 * 1000, limit: 30 }],
    }),
    ...(clientRoot
      ? [
          ServeStaticModule.forRoot({
            rootPath: clientRoot,
            exclude: ['/api/(.*)'],
          }),
        ]
      : []),
    ContactModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
