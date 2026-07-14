import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    mobile: string;
    role: string;
    sessionId: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const result = await this.authService.login(
      dto.mobile,
      dto.password,
      {
        userAgent: request.get('user-agent'),
        ipAddress: request.ip,
      },
    );

    this.setRefreshTokenCookie(
      response,
      result.refreshToken,
      result.refreshTokenMaxAgeMs,
    );

    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('admin/login')
  async adminLogin(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const result =
      await this.authService.adminLogin(
        dto.mobile,
        dto.password,
        {
          userAgent: request.get('user-agent'),
          ipAddress: request.ip,
        },
      );

    this.setRefreshTokenCookie(
      response,
      result.refreshToken,
      result.refreshTokenMaxAgeMs,
    );

    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const refreshToken =
      request.cookies?.refresh_token;

    const result = await this.authService.refresh(
      typeof refreshToken === 'string'
        ? refreshToken
        : '',
    );

    this.setRefreshTokenCookie(
      response,
      result.refreshToken,
      result.refreshTokenMaxAgeMs,
    );

    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const refreshToken =
      request.cookies?.refresh_token;

    const result = await this.authService.logout(
      typeof refreshToken === 'string'
        ? refreshToken
        : '',
    );

    this.clearRefreshTokenCookie(response);

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const result = await this.authService.logoutAll(
      request.user.id,
    );

    this.clearRefreshTokenCookie(response);

    return result;
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
    maxAge: number,
  ) {
    response.cookie(
      'refresh_token',
      refreshToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth',
        maxAge,
      },
    );
  }

  private clearRefreshTokenCookie(
    response: Response,
  ) {
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
    });
  }
}