export class SessionResponseDto {
  id: string;
  deviceType: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  lastActivityAt: Date;
  createdAt: Date;
  expiresAt: Date;
}

export function toSessionResponseDto(session: {
  id: string;
  deviceType: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  lastActivityAt: Date;
  createdAt: Date;
  expiresAt: Date;
}): SessionResponseDto {
  return {
    id: session.id,
    deviceType: session.deviceType,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    lastActivityAt: session.lastActivityAt,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };
}
