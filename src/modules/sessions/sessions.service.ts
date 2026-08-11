import { Injectable } from '@nestjs/common';
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
}
