import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({ description: 'Thông báo kết quả' })
  message: string;
}

export class LogoutAllResponseDto extends MessageResponseDto {
  @ApiProperty({ description: 'Số session đã bị thu hồi' })
  revokedCount: number;
}
