import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { RegisterResponseDto } from '../users/dto/user-response.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  LogoutAllResponseDto,
  MessageResponseDto,
} from './dto/message-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenPairResponseDto } from './dto/token-pair-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { RequestUser } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Stricter than the app-wide default (100/min): unauthenticated endpoints
  // that drive account creation, credential checks, or token issuance are
  // the actual brute-force/credential-stuffing/spam targets.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (tự động gán role USER)' })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiConflictResponse({ description: 'Email đã được đăng ký' })
  @ApiTooManyRequestsResponse({
    description: 'Gọi quá số lần cho phép trong 1 phút',
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Đăng nhập — cấp cặp access token + refresh token' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sai email hoặc mật khẩu' })
  @ApiForbiddenResponse({
    description: 'Tài khoản đã bị khoá (isActive = false)',
  })
  @ApiTooManyRequestsResponse({
    description: 'Gọi quá số lần cho phép trong 1 phút',
  })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Làm mới token — đổi refresh token cũ lấy cặp access/refresh token mới (rotation, token cũ mất hiệu lực ngay)',
  })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({
    description:
      'Refresh token không hợp lệ, đã hết hạn, hoặc đã bị dùng rồi (reuse sau khi rotate)',
  })
  @ApiForbiddenResponse({
    description: 'Tài khoản đã bị khoá (isActive = false)',
  })
  @ApiTooManyRequestsResponse({
    description: 'Gọi quá số lần cho phép trong 1 phút',
  })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất session hiện tại' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Thiếu access token hoặc token không hợp lệ',
  })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request & { user: RequestUser }) {
    await this.authService.logout(req.user.sessionId, req.user.userId);
    return { message: 'Logged out' };
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đăng xuất toàn bộ session của user hiện tại — mọi thiết bị',
  })
  @ApiOkResponse({ type: LogoutAllResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Thiếu access token hoặc token không hợp lệ',
  })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  async logoutAll(@Req() req: Request & { user: RequestUser }) {
    const count = await this.authService.logoutAll(req.user.userId);
    return { message: 'Logged out from all devices', revokedCount: count };
  }
}
