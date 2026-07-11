import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

import { JwtStrategy } from './jwt.strategy/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    UsersModule,

    PassportModule,

    JwtModule.register({
      secret: 'feloral_super_secret_key_2026',
      signOptions: {
        expiresIn: '30d',
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
  ],

  exports: [
    AuthService,
    JwtModule,
  ],
})
export class AuthModule {}