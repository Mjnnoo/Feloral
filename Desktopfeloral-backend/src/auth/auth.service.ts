import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

interface LoginMetadata {
  userAgent?: string;
  ipAddress?: string;
}

interface RefreshTokenPayload {
  sub: number;
  sessionId: string;
  tokenType: 'refresh';
}
const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'editor',
  'seo',
  'ai',
] as const;
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        mobile: dto.mobile,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'کاربری با این شماره موبایل قبلاً ثبت‌نام کرده است',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName,
          mobile: dto.mobile,
          email: dto.email ?? null,
          password: hashedPassword,
        },
        select: {
          id: true,
          fullName: true,
          mobile: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      return {
        message: 'ثبت‌نام با موفقیت انجام شد',
        user,
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'کاربری با این اطلاعات قبلاً ثبت‌نام کرده است',
        );
      }

      throw new InternalServerErrorException(
        'ثبت‌نام با خطا مواجه شد',
      );
    }
  }

  async login(
    mobile: string,
    password: string,
    metadata: LoginMetadata,
    allowedRoles?: readonly string[],
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        mobile,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'شماره موبایل یا رمز عبور اشتباه است',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'حساب کاربری غیرفعال است',
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'شماره موبایل یا رمز عبور اشتباه است',
      );
    }

    const normalizedRole = user.role
  .trim()
  .toLowerCase();

if (
  allowedRoles &&
  !allowedRoles.includes(normalizedRole)
) {
  throw new ForbiddenException(
    'اجازه ورود به پنل مدیریت را ندارید',
  );
}

    const sessionId = randomUUID();

    const refreshTokenMaxAgeMs =
      this.getRefreshTokenMaxAgeMs();

    const refreshToken = await this.createRefreshToken(
      user.id,
      sessionId,
      refreshTokenMaxAgeMs,
    );

    const accessToken = await this.createAccessToken({
      id: user.id,
      mobile: user.mobile,
      role: normalizedRole,
      sessionId,
    });

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        userAgent:
          metadata.userAgent?.slice(0, 500) ?? null,
        ipAddress:
          metadata.ipAddress?.slice(0, 100) ?? null,
        expiresAt: new Date(
          Date.now() + refreshTokenMaxAgeMs,
        ),
      },
    });

    return {
      access_token: accessToken,
      refreshToken,
      refreshTokenMaxAgeMs,
      user: {
        id: user.id,
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        role: normalizedRole,
      },
    };
  }
async adminLogin(
  mobile: string,
  password: string,
  metadata: LoginMetadata,
) {
  return this.login(
    mobile,
    password,
    metadata,
    ADMIN_ROLES,
  );
}
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException(
        'نشست کاربری یافت نشد',
      );
    }

    let payload: RefreshTokenPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<RefreshTokenPayload>(
          refreshToken,
          {
            secret:
              this.configService.getOrThrow<string>(
                'JWT_REFRESH_SECRET',
              ),
          },
        );
    } catch {
      throw new UnauthorizedException(
        'نشست منقضی یا نامعتبر است',
      );
    }

    if (
      payload.tokenType !== 'refresh' ||
      !payload.sub ||
      !payload.sessionId
    ) {
      throw new UnauthorizedException(
        'Refresh Token معتبر نیست',
      );
    }

    const session = await this.prisma.session.findUnique({
      where: {
        id: payload.sessionId,
      },
      include: {
        user: true,
      },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException(
        'نشست منقضی یا غیرفعال است',
      );
    }

    const currentTokenHash =
      this.hashToken(refreshToken);

    if (
      session.refreshTokenHash !== currentTokenHash
    ) {
      await this.prisma.session.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      throw new UnauthorizedException(
        'استفاده غیرمجاز از Refresh Token شناسایی شد',
      );
    }

    const refreshTokenMaxAgeMs =
      this.getRefreshTokenMaxAgeMs();

    const newRefreshToken =
      await this.createRefreshToken(
        session.user.id,
        session.id,
        refreshTokenMaxAgeMs,
      );

    const newAccessToken =
      await this.createAccessToken({
        id: session.user.id,
        mobile: session.user.mobile,
        role: session.user.role,
        sessionId: session.id,
      });

    const updateResult =
      await this.prisma.session.updateMany({
        where: {
          id: session.id,
          refreshTokenHash: currentTokenHash,
          revokedAt: null,
        },
        data: {
          refreshTokenHash:
            this.hashToken(newRefreshToken),
          lastUsedAt: new Date(),
          expiresAt: new Date(
            Date.now() + refreshTokenMaxAgeMs,
          ),
        },
      });

    if (updateResult.count !== 1) {
      throw new UnauthorizedException(
        'این Refresh Token قبلاً استفاده شده است',
      );
    }

    return {
      access_token: newAccessToken,
      refreshToken: newRefreshToken,
      refreshTokenMaxAgeMs,
      user: {
        id: session.user.id,
        fullName: session.user.fullName,
        mobile: session.user.mobile,
        email: session.user.email,
        role: session.user.role,
      },
    };
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      try {
        const payload =
          await this.jwtService.verifyAsync<RefreshTokenPayload>(
            refreshToken,
            {
              secret:
                this.configService.getOrThrow<string>(
                  'JWT_REFRESH_SECRET',
                ),
            },
          );

        if (
          payload.tokenType === 'refresh' &&
          payload.sessionId &&
          payload.sub
        ) {
          await this.prisma.session.updateMany({
            where: {
              id: payload.sessionId,
              userId: payload.sub,
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
            },
          });
        }
      } catch {
        // خروج باید حتی با Cookie منقضی یا نامعتبر هم موفق باشد.
      }
    }

    return {
      message: 'با موفقیت از حساب کاربری خارج شدید',
    };
  }

  async logoutAll(userId: number) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'از تمام دستگاه‌ها خارج شدید',
    };
  }

  private async createRefreshToken(
    userId: number,
    sessionId: string,
    maxAgeMs: number,
  ) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        sessionId,
        tokenType: 'refresh',
        jti: randomUUID(),
      },
      {
        secret:
          this.configService.getOrThrow<string>(
            'JWT_REFRESH_SECRET',
          ),
        expiresIn: Math.floor(maxAgeMs / 1000),
      },
    );
  }

  private async createAccessToken(user: {
    id: number;
    mobile: string;
    role: string;
    sessionId: string;
  }) {
    return this.jwtService.signAsync({
      sub: user.id,
      mobile: user.mobile,
      role: user.role,
      sessionId: user.sessionId,
      tokenType: 'access',
      jti: randomUUID(),
    });
  }

  private getRefreshTokenMaxAgeMs(): number {
    const lifetime =
      this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '30d',
      );

    return this.parseDurationToMilliseconds(lifetime);
  }

  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  private parseDurationToMilliseconds(
    duration: string,
  ): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(
      duration.trim(),
    );

    if (!match) {
      throw new InternalServerErrorException(
        'مقدار JWT_REFRESH_EXPIRES_IN معتبر نیست',
      );
    }

    const amount = Number(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit];
  }
}