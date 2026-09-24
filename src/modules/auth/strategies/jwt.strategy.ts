import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from 'src/providers/redis/redis.service';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  roles: string[];
  permissions: string[];
  type: 'access';
}

export interface RequestUser {
  userId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') as string,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const isBlacklisted = await this.redis.exists(
      `auth:blacklist:${payload.sid}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Session has been revoked');
    }

    return {
      userId: payload.sub,
      sessionId: payload.sid,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}
