import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    super({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
      password: configService.get<string>('REDIS_PASSWORD') || undefined,
    });
  }

  // Fail fast at boot if Redis is unreachable, rather than surfacing a
  // confusing error on the first login/refresh request.
  async onModuleInit() {
    await this.ping();
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
