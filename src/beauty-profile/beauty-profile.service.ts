import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { UpsertBeautyProfileDto } from './dto/upsert-beauty-profile.dto';

@Injectable()
export class BeautyProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: number) {
    return this.prisma.beautyProfile.findUnique({
      where: {
        userId,
      },
      include: this.profileInclude(),
    });
  }

  async upsertMyProfile(
    userId: number,
    data: UpsertBeautyProfileDto,
  ) {
    await this.ensureUserExists(userId);

    this.validateBudget(data);

    return this.prisma.beautyProfile.upsert({
      where: {
        userId,
      },
      create: {
        userId,

        skinType: data.skinType ?? null,
        undertone: data.undertone ?? null,

        scentFamilies: data.scentFamilies ?? [],
        favoriteNotes: data.favoriteNotes ?? [],
        allergies: data.allergies ?? [],
        preferredBrands: data.preferredBrands ?? [],

        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,

        beautyGoals: data.beautyGoals ?? [],
      },
      update: {
        skinType: data.skinType,
        undertone: data.undertone,

        scentFamilies: data.scentFamilies,
        favoriteNotes: data.favoriteNotes,
        allergies: data.allergies,
        preferredBrands: data.preferredBrands,

        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,

        beautyGoals: data.beautyGoals,
      },
      include: this.profileInclude(),
    });
  }

  async deleteMyProfile(userId: number) {
    const profile = await this.prisma.beautyProfile.findUnique({
      where: {
        userId,
      },
    });

    if (!profile) {
      throw new NotFoundException('Beauty profile not found');
    }

    return this.prisma.beautyProfile.delete({
      where: {
        userId,
      },
    });
  }

  async getAllForAdmin() {
    return this.prisma.beautyProfile.findMany({
      include: this.profileInclude(),
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getByUserForAdmin(userId: number) {
    await this.ensureUserExists(userId);

    const profile = await this.prisma.beautyProfile.findUnique({
      where: {
        userId,
      },
      include: this.profileInclude(),
    });

    if (!profile) {
      throw new NotFoundException('Beauty profile not found');
    }

    return profile;
  }

  private validateBudget(data: UpsertBeautyProfileDto) {
    if (
      data.budgetMin !== undefined &&
      data.budgetMax !== undefined &&
      data.budgetMin > data.budgetMax
    ) {
      throw new BadRequestException(
        'budgetMin cannot be greater than budgetMax',
      );
    }
  }

  private async ensureUserExists(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private profileInclude() {
    return {
      user: {
        select: {
          id: true,
          fullName: true,
          mobile: true,
          email: true,
          role: true,
        },
      },
    };
  }
}