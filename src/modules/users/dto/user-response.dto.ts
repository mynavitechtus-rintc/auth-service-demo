import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    example: 'USER',
    description: 'Tên role — USER, MODERATOR, ADMIN',
  })
  name: string;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ nullable: true, type: String, description: 'Tên' })
  firstName: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, description: 'Họ' })
  lastName: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  avatarUrl: string | null;

  @ApiProperty({
    description: 'false = tài khoản đã bị khoá, không login được nữa',
  })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RegisterResponseDto extends UserResponseDto {
  @ApiProperty({
    type: [RoleResponseDto],
    description: 'Mặc định chỉ có role USER khi vừa đăng ký',
  })
  roles: RoleResponseDto[];
}
