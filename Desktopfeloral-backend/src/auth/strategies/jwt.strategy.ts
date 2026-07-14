import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: number;
  mobile: string;
  role: string;
  sessionId: string;
  tokenType: 'access';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.getOrThrow<string>(
          'JWT_ACCESS_SECRET',
        ),
    });
  }

  async validate(payload: JwtPayload) {
    if (
      payload.tokenType !== 'access' ||
      !payload.sub ||
      !payload.sessionId
    ) {
      throw new UnauthorizedException(
        'Access Token معتبر نیست',
      );
    }

    const session =
      await this.prisma.session.findUnique({
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
      session.revokedAt !== null ||
      session.expiresAt <= new Date() ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException(
        'نشست کاربری منقضی یا غیرفعال است',
      );
    }

    return {
      id: session.user.id,
      mobile: session.user.mobile,
      role: session.user.role,
      sessionId: session.id,
    };
  }
}