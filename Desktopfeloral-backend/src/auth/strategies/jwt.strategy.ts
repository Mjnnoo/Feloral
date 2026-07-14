import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

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
  constructor(configService: ConfigService) {
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

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      mobile: payload.mobile,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  }
}