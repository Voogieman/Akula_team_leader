import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
export class HealthController {
  @SkipThrottle()
  @Get('health')
  health() {
    return { ok: true, status: 'up' };
  }
}
