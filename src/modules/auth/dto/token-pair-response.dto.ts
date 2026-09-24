import { ApiProperty } from '@nestjs/swagger';

export class TokenPairResponseDto {
  @ApiProperty({
    description:
      'Token sống ngắn (mặc định 15 phút) — gửi kèm mọi request cần auth qua header Authorization: Bearer <token>',
  })
  accessToken: string;

  @ApiProperty({
    description:
      'Token sống dài (mặc định 7 ngày) — CHỈ gửi tới POST /auth/refresh, không dùng để gọi API khác. Mỗi lần refresh, token cũ mất hiệu lực ngay (rotation)',
  })
  refreshToken: string;
}
