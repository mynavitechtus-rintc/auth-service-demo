import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({
    description: 'ID session — dùng để gọi DELETE /auth/sessions/:id',
  })
  id: string;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'mobile' })
  deviceType: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  userAgent: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  ipAddress: string | null;

  @ApiProperty({ description: 'Lần refresh token gần nhất trên session này' })
  lastActivityAt: Date;

  @ApiProperty({ description: 'Thời điểm đăng nhập tạo ra session này' })
  createdAt: Date;

  @ApiProperty({
    description:
      'Chỉ mang tính hiển thị — không phải hạn thật của refresh token trong Redis (rolling TTL, xem docs/AUTH_FLOW_EXPLAINED.md mục 5)',
  })
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
