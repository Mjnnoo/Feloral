import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // =========================
  // REGISTER
  // =========================
  async register(data: {
    fullName: string;
    mobile: string;
    password: string;
    email?: string;
  }) {
    try {
      if (!data.fullName || !data.mobile || !data.password) {
        throw new Error('Missing required fields');
      }

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
          email: data.email || null,
          password: hashedPassword,
        },
      });

      return {
        message: 'User created successfully',
        user: {
          id: user.id,
          fullName: user.fullName,
          mobile: user.mobile,
          email: user.email,
          role: user.role,
        },
      };
    } catch (err) {
      console.error('REGISTER ERROR:', err);
      throw new InternalServerErrorException(err.message || 'Register failed');
    }
  }

  // =========================
  // LOGIN
  // =========================
  async login(mobile: string, password: string) {
    try {
      if (!mobile || !password) {
        throw new UnauthorizedException('Mobile and password required');
      }

      const user = await this.prisma.user.findUnique({
        where: { mobile },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const ok = await bcrypt.compare(password, user.password ?? '');

      if (!ok) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const token = await this.jwtService.signAsync({
        sub: user.id,
        mobile: user.mobile,
        role: user.role,
      });

      return {
        access_token: token,
        user: {
          id: user.id,
          fullName: user.fullName,
          mobile: user.mobile,
          role: user.role,
        },
      };
    } catch (err) {
      console.error('LOGIN ERROR:', err);
      throw err;
    }
  }
}