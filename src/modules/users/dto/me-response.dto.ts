import { ApiProperty } from '@nestjs/swagger';

export class MeResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({
    description:
      'ID của session hiện tại — dùng để gọi DELETE /auth/sessions/:id',
  })
  sessionId: string;

  @ApiProperty({ type: [String], example: ['USER'] })
  roles: string[];

  @ApiProperty({
    type: [String],
    example: ['users:list'],
    description:
      'Định dạng "resource:action" — đọc thẳng từ token, không query DB',
  })
  permissions: string[];
}
