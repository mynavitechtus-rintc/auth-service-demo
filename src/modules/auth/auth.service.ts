import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Prisma } from 'generated/prisma/client';
import ms, { StringValue } from 'ms';
import { UAParser } from 'ua-parser-js';
import { RedisService } from 'src/providers/redis/redis.service';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenPayload } from './strategies/jwt.strategy';
import { hashToken } from './utils/hash-token.util';

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

interface LoginContext {
  ip?: string;
  userAgent?: string;
}

// Precomputed once at module load so the "user not found" path in login()
// pays the same argon2 cost as the "wrong password" path — otherwise the
// response-time difference leaks whether an email is registered, even
// though both paths throw the same error message.
const DUMMY_PASSWORD_HASH = argon2.hash('dummy-password-for-timing-safety');

const REFRESH_WHITELIST_PREFIX = 'auth:refresh:';
const ACCESS_BLACKLIST_PREFIX = 'auth:blacklist:';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    let user: Awaited<ReturnType<UsersService['create']>>;
    try {
      user = await this.usersService.create({
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });
    } catch (err) {
      // P2002: unique constraint violation (email) — closes the race window
      // between the findByEmail check above and this create call.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }

    const safeUser: Partial<typeof user> = { ...user };
    delete safeUser.passwordHash;
    return safeUser;
  }

  async login(
    dto: LoginDto,
    context: LoginContext = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await argon2.verify(await DUMMY_PASSWORD_HASH, dto.password);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Checked after password verification, not before: the credentials are
    // already proven correct at this point, so surfacing a distinct message
    // doesn't leak anything an attacker couldn't already infer.
    if (!user.isActive) {
      throw new ForbiddenException('Account has been disabled');
    }

    const { roles: userRoles } =
      await this.usersService.findRolesWithPermissions(user.id);
    const roles = userRoles.map((role) => role.name);
    const permissions = [
      ...new Set(
        userRoles.flatMap((role) =>
          role.permissions.map((permission) => permission.name),
        ),
      ),
    ];

    const { refreshTtl, refreshTtlMs } = this.getRefreshTtl();
    const expiresAt = new Date(Date.now() + refreshTtlMs);
    const deviceType = context.userAgent
      ? (new UAParser(context.userAgent).getDevice().type ?? 'desktop')
      : 'unknown';

    const session = await this.sessionsService.createSession({
      userId: user.id,
      deviceType,
      ip: context.ip,
      userAgent: context.userAgent,
      expiresAt,
    });

    const { accessToken, refreshToken } = await this.mintTokenPair(
      user.id,
      session.id,
      roles,
      permissions,
      refreshTtl,
    );

    await this.redis.set(
      REFRESH_WHITELIST_PREFIX + session.id,
      hashToken(refreshToken),
      'PX',
      refreshTtlMs,
    );

    return { accessToken, refreshToken };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: this.configService.get<string>('JWT_REFRESH_SECRET') },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const whitelistKey = REFRESH_WHITELIST_PREFIX + payload.sid;
    const storedHash = await this.redis.get(whitelistKey);
    if (!storedHash || storedHash !== hashToken(refreshToken)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { isActive, roles: userRoles } =
      await this.usersService.findRolesWithPermissions(payload.sub);

    // A previously-issued refresh token stays cryptographically valid even
    // after an account is disabled — this is the enforcement point that
    // catches that case (the account may have been active when the token
    // whitelist entry above was created).
    if (!isActive) {
      throw new ForbiddenException('Account has been disabled');
    }

    const roles = userRoles.map((role) => role.name);
    const permissions = [
      ...new Set(
        userRoles.flatMap((role) =>
          role.permissions.map((permission) => permission.name),
        ),
      ),
    ];

    const { refreshTtl, refreshTtlMs } = this.getRefreshTtl();

    const tokens = await this.mintTokenPair(
      payload.sub,
      payload.sid,
      roles,
      permissions,
      refreshTtl,
    );

    await this.redis.set(
      whitelistKey,
      hashToken(tokens.refreshToken),
      'PX',
      refreshTtlMs,
    );

    // Best-effort only: the rotation above already succeeded and the new
    // tokens are the source of truth for the response. If this throws (e.g.
    // Session row missing/DB blip), the caller must still get their rotated
    // tokens rather than being locked out by a failed timestamp update.
    try {
      await this.sessionsService.touchActivity(payload.sid);
    } catch {
      // no-op — see comment above
    }

    return tokens;
  }

  // Handles both "log out my own current session" (called with the caller's
  // own sessionId/userId from the JWT) and "revoke an arbitrary session I
  // own" (DELETE /auth/sessions/:id, sessionId from a URL param) — same
  // operation either way, ownership is enforced identically in both cases.
  async logout(sessionId: string, requesterId: string): Promise<void> {
    // Ownership check happens first (inside sessionsService.revoke), before
    // any Redis mutation, so a caller probing another user's session ID
    // can't trigger a side effect before the 403 is raised.
    await this.sessionsService.revoke(sessionId, requesterId);
    await this.revokeSessionTokens(sessionId);
  }

  async logoutAll(userId: string): Promise<number> {
    const sessions = await this.sessionsService.findActiveByUser(userId);
    // allSettled, not all: one session's transient Redis blip shouldn't
    // discard an otherwise-successful batch logout, and revokeAll() below
    // should still run to reconcile Postgres for the sessions that did
    // succeed (mirrors the best-effort reasoning in refresh()'s touchActivity
    // call above).
    await Promise.allSettled(
      sessions.map((session) => this.revokeSessionTokens(session.id)),
    );
    return this.sessionsService.revokeAll(userId);
  }

  private async revokeSessionTokens(sessionId: string): Promise<void> {
    // Delete the refresh whitelist entry FIRST. If this step were to fail
    // and we'd already set the blacklist, /auth/refresh would keep working
    // indefinitely for a session that looks "logged out" — the single
    // highest-severity mistake possible in this design. Deleting the
    // whitelist first means any partial failure below still leaves refresh
    // broken for this session; only the already-issued access token would
    // remain valid until its own (short) natural expiry.
    await this.redis.del(REFRESH_WHITELIST_PREFIX + sessionId);

    const { accessTtlMs } = this.getAccessTtl();
    await this.redis.set(
      ACCESS_BLACKLIST_PREFIX + sessionId,
      '1',
      'PX',
      accessTtlMs,
    );
  }

  private getAccessTtl(): { accessTtl: string; accessTtlMs: number } {
    const accessTtl = this.configService.get<string>('JWT_ACCESS_TTL', '15m');
    return { accessTtl, accessTtlMs: ms(accessTtl as StringValue) };
  }

  private getRefreshTtl(): { refreshTtl: string; refreshTtlMs: number } {
    const refreshTtl = this.configService.get<string>('JWT_REFRESH_TTL', '7d');
    return { refreshTtl, refreshTtlMs: ms(refreshTtl as StringValue) };
  }

  private async mintTokenPair(
    userId: string,
    sessionId: string,
    roles: string[],
    permissions: string[],
    refreshTtl: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: AccessTokenPayload = {
      sub: userId,
      sid: sessionId,
      roles,
      permissions,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      sid: sessionId,
      type: 'refresh',
    };

    // Access token secret/expiresIn already configured via
    // JwtModule.registerAsync in auth.module.ts.
    const accessToken = await this.jwtService.signAsync(accessPayload);
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshTtl as JwtSignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }
}
