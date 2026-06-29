import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'feloral_super_secret_key_2026',
    });
  }

  async validate(payload: any) {
    console.log('========== JWT ==========');
    console.log(payload);

    return {
      id: payload.sub,
      mobile: payload.mobile,
      role: payload.role,
    };
  }
}