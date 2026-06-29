import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProductExperienceDto } from './dto/create-product-experience.dto';
import { UpdateProductExperienceDto } from './dto/update-product-experience.dto';

@Injectable()
export class ProductExperienceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductExperienceDto) {
    await this.ensureProductExists(data.productId);

    const existing = await this.prisma.productExperience.findUnique({
      where: {
        productId: data.productId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Product experience already exists for this product',
      );
    }

    return this.prisma.productExperience.create({
      data: {
        productId: data.productId,

        visualTheme: data.visualTheme ?? null,
        mood: data.mood ?? null,
        colorPalette: data.colorPalette ?? [],

        motionPreset: data.motionPreset ?? null,
        heroVideoUrl: data.heroVideoUrl ?? null,
        threeDModelUrl: data.threeDModelUrl ?? null,
        arModelUrl: data.arModelUrl ?? null,

        scentFamily: data.scentFamily ?? null,
        topNotes: data.topNotes ?? [],
        middleNotes: data.middleNotes ?? [],
        baseNotes: data.baseNotes ?? [],

        season: data.season ?? [],
        occasion: data.occasion ?? [],
        gender: data.gender ?? null,
        longevity: data.longevity ?? null,
        sillage: data.sillage ?? null,

        skinTypes: data.skinTypes ?? [],
        routineStep: data.routineStep ?? null,
        texture: data.texture ?? null,
      },
      include: this.experienceInclude(),
    });
  }

  async findAll() {
    return this.prisma.productExperience.findMany({
      include: this.experienceInclude(),
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findByProduct(productId: number) {
    await this.ensureProductExists(productId);

    return this.prisma.productExperience.findUnique({
      where: {
        productId,
      },
      include: this.experienceInclude(),
    });
  }

  async upsertByProduct(
    productId: number,
    data: UpdateProductExperienceDto,
  ) {
    await this.ensureProductExists(productId);

    return this.prisma.productExperience.upsert({
      where: {
        productId,
      },
      create: {
        productId,

        visualTheme: data.visualTheme ?? null,
        mood: data.mood ?? null,
        colorPalette: data.colorPalette ?? [],

        motionPreset: data.motionPreset ?? null,
        heroVideoUrl: data.heroVideoUrl ?? null,
        threeDModelUrl: data.threeDModelUrl ?? null,
        arModelUrl: data.arModelUrl ?? null,

        scentFamily: data.scentFamily ?? null,
        topNotes: data.topNotes ?? [],
        middleNotes: data.middleNotes ?? [],
        baseNotes: data.baseNotes ?? [],

        season: data.season ?? [],
        occasion: data.occasion ?? [],
        gender: data.gender ?? null,
        longevity: data.longevity ?? null,
        sillage: data.sillage ?? null,

        skinTypes: data.skinTypes ?? [],
        routineStep: data.routineStep ?? null,
        texture: data.texture ?? null,
      },
      update: {
        visualTheme: data.visualTheme,
        mood: data.mood,
        colorPalette: data.colorPalette,

        motionPreset: data.motionPreset,
        heroVideoUrl: data.heroVideoUrl,
        threeDModelUrl: data.threeDModelUrl,
        arModelUrl: data.arModelUrl,

        scentFamily: data.scentFamily,
        topNotes: data.topNotes,
        middleNotes: data.middleNotes,
        baseNotes: data.baseNotes,

        season: data.season,
        occasion: data.occasion,
        gender: data.gender,
        longevity: data.longevity,
        sillage: data.sillage,

        skinTypes: data.skinTypes,
        routineStep: data.routineStep,
        texture: data.texture,
      },
      include: this.experienceInclude(),
    });
  }

  async remove(id: number) {
    const experience =
      await this.prisma.productExperience.findUnique({
        where: { id },
      });

    if (!experience) {
      throw new NotFoundException('Product experience not found');
    }

    return this.prisma.productExperience.delete({
      where: { id },
    });
  }

  private async ensureProductExists(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private experienceInclude() {
    return {
      product: {
        select: {
          id: true,
          name: true,
          englishName: true,
          slug: true,
          brand: true,
          category: true,
        },
      },
    };
  }
}