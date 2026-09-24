import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { RequestUser } from '../auth/strategies/jwt.strategy';
import { MeResponseDto } from './dto/me-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Lấy danh sách toàn bộ user (yêu cầu permission users:list)',
  })
  @ApiOkResponse({ type: [UserResponseDto] })
  @ApiUnauthorizedResponse({
    description: 'Thiếu access token hoặc token không hợp lệ',
  })
  @ApiForbiddenResponse({ description: 'Thiếu permission users:list' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users:list')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({
    summary: 'Lấy thông tin người gọi hiện tại',
    description:
      'Đọc thẳng từ payload đã giải mã trong access token — không query Postgres, nên roles/permissions có thể cũ nếu admin vừa đổi quyền (chỉ cập nhật khi login lại hoặc refresh).',
  })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Thiếu access token hoặc token không hợp lệ',
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: RequestUser }) {
    return req.user;
  }
}
