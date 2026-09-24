import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/providers/prisma/prisma.service';

interface CreateSessionParams {
  userId: string;
  deviceType?: string;
  ip?: string;
  userAgent?: string;
  expiresAt: Date;
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(params: CreateSessionParams) {
    return this.prisma.session.create({
      data: {
        userId: params.userId,
        deviceType: params.deviceType,
        ipAddress: params.ip,
        userAgent: params.userAgent,
        expiresAt: params.expiresAt,
      },
    });
  }

  async touchActivity(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  }

  async findActiveByUser(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Ownership check happens here, BEFORE any Postgres write and before the
  // caller does any Redis mutation — a session ID is a guessable-format UUID
  // coming from a URL param, so authorization must be verified first to
  // avoid a caller triggering side effects (e.g. blacklisting someone else's
  // session) before the 403 is raised.
  async revoke(sessionId: string, requesterId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    // Same error for "not found" and "not yours" — don't let the response
    // reveal whether a given session ID exists at all.
    if (!session || session.userId !== requesterId) {
      throw new ForbiddenException('Cannot revoke a session you do not own');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    return result.count;
  }
}
