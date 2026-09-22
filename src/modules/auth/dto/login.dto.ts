import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  // Caps input size before it reaches argon2.verify(), whose cost scales
  // with input length — without this, an unauthenticated caller could send
  // an oversized password to burn CPU on the server.
  @ApiProperty({ description: 'Mật khẩu', minLength: 1, maxLength: 128 })
  @IsString()
  @MaxLength(128)
  password: string;
}
