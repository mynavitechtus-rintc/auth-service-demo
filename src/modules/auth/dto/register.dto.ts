import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  // Same argon2 cost-scaling concern as LoginDto: cap input size before it
  // reaches argon2.hash().
  @ApiProperty({
    description: 'Mật khẩu, tối thiểu 8 ký tự',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ description: 'Tên' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Họ' })
  @IsOptional()
  @IsString()
  lastName?: string;
}
