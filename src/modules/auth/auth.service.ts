import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Prisma } from 'generated/prisma/client';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenPayload } from './strategies/jwt.strategy';

// Precomputed once at module load so the "user not found" path in login()
// pays the same argon2 cost as the "wrong password" path — otherwise the
// response-time difference leaks whether an email is registered, even
// though both paths throw the same error message.
const DUMMY_PASSWORD_HASH = argon2.hash('dummy-password-for-timing-safety');

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
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

    const userRoles = await this.usersService.findRolesWithPermissions(user.id);
    const roles = userRoles.map((role) => role.name);
    const permissions = [
      ...new Set(
        userRoles.flatMap((role) =>
          role.permissions.map((permission) => permission.name),
        ),
      ),
    ];

    const payload: AccessTokenPayload = {
      sub: user.id,
      roles,
      permissions,
      type: 'access',
    };

    // secret/expiresIn already configured via JwtModule.registerAsync in auth.module.ts
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }
}
