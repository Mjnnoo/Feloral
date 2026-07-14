import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

  async login(mobile: string, password: string) {
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

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      mobile: user.mobile,
      role: user.role,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
      },
    };
  }
}