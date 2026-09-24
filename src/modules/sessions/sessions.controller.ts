import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/strategies/jwt.strategy';
import { MessageResponseDto } from '../auth/dto/message-response.dto';
import {
  SessionResponseDto,
  toSessionResponseDto,
} from './dto/session-response.dto';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('auth/sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({
    summary: 'Liệt kê các session đang hoạt động của user hiện tại',
  })
  @ApiOkResponse({ type: [SessionResponseDto] })
  @ApiUnauthorizedResponse({
    description: 'Thiếu access token hoặc token không hợp lệ',
  })
  @Get()
  async list(@Req() req: Request & { user: RequestUser }) {
    const sessions = await this.sessionsService.findActiveByUser(
      req.user.userId,
    );
    return sessions.map(toSessionResponseDto);
  }

  @ApiOperation({
    summary:
      'Thu hồi (revoke) 1 session — chỉ được thu hồi session của chính mình',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Thiếu access token hoặc token không hợp lệ',
  })
  @ApiForbiddenResponse({ description: 'Session không thuộc về user đang gọi' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async revoke(
    @Param('id') sessionId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.authService.logout(sessionId, req.user.userId);
    return { message: 'Session revoked' };
  }
}
