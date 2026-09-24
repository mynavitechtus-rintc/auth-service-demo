import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token lấy được từ lần login hoặc refresh trước đó',
  })
  @IsString()
  refreshToken: string;
}
