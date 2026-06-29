import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // =========================
  // REGISTER
  // =========================
  async register(data: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { mobile: data.mobile },
    });

    if (exists) {
      throw new ConflictException('Mobile already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: data.fullName,
        mobile: data.mobile,
        email: data.email ?? null,
        password: hashedPassword,
      },
      select: {
        id: true,
        fullName: true,
        mobile: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      message: 'User created successfully',
      user,
    };
  }

  // =========================
  // LOGIN
  // =========================
  async login(mobile: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { mobile },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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