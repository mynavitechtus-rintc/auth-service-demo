import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [HealthModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
