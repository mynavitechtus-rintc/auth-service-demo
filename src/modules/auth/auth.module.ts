import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { SessionsModule } from '../sessions/sessions.module';
import { SessionsController } from '../sessions/sessions.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    SessionsModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_ACCESS_TTL',
            '15m',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  // SessionsController lives here (not in SessionsModule, despite its file
  // being under src/modules/sessions/) because it injects both AuthService
  // and SessionsService. AuthModule already has both in scope — AuthService
  // as a local provider, SessionsService via the SessionsModule import above
  // — with zero circularity. Declaring it inside SessionsModule instead would
  // force SessionsModule to import AuthModule back in, recreating the
  // AuthModule <-> SessionsModule cycle this placement avoids. Do NOT move
  // this controller into SessionsModule's `controllers` array.
  controllers: [AuthController, SessionsController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
