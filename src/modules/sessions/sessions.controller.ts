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
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/strategies/jwt.strategy';
import { toSessionResponseDto } from './dto/session-response.dto';
import { SessionsService } from './sessions.service';

@Controller('auth/sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list(@Req() req: Request & { user: RequestUser }) {
    const sessions = await this.sessionsService.findActiveByUser(
      req.user.userId,
    );
    return sessions.map(toSessionResponseDto);
  }

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
