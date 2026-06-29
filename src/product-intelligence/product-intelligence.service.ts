import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProductIntelligenceDto } from './dto/create-product-intelligence.dto';
import { UpdateProductIntelligenceDto } from './dto/update-product-intelligence.dto';

@Injectable()
export class ProductIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductIntelligenceDto) {
    await this.ensureProductExists(data.productId);

    const existing =
      await this.prisma.productIntelligence.findUnique({
        where: {
          productId: data.productId,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Product intelligence already exists for this product',
      );
    }

    await this.validateComplementaryProducts(
      data.productId,
      data.complementaryProductIds ?? [],
    );

    return this.prisma.productIntelligence.create({
      data: {
        productId: data.productId,

        aiGeneratedTitle: data.aiGeneratedTitle ?? null,
        aiGeneratedShortDesc: data.aiGeneratedShortDesc ?? null,
        aiGeneratedDescription:
          data.aiGeneratedDescription ?? null,

        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        seoKeywords: data.seoKeywords ?? [],

        storyTitle: data.storyTitle ?? null,
        storyText: data.storyText ?? null,

        howToUse: data.howToUse ?? null,
        warnings: data.warnings ?? null,

        suitableFor: data.suitableFor ?? [],
        ingredients: data.ingredients ?? [],
        benefits: data.benefits ?? [],

        complementaryProductIds:
          data.complementaryProductIds ?? [],
      },
      include: this.intelligenceInclude(),
    });
  }

  async findAll() {
    return this.prisma.productIntelligence.findMany({
      include: this.intelligenceInclude(),
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findByProduct(productId: number) {
    await this.ensureProductExists(productId);

    return this.prisma.productIntelligence.findUnique({
      where: {
        productId,
      },
      include: this.intelligenceInclude(),
    });
  }

  async upsertByProduct(
    productId: number,
    data: UpdateProductIntelligenceDto,
  ) {
    await this.ensureProductExists(productId);

    await this.validateComplementaryProducts(
      productId,
      data.complementaryProductIds ?? [],
    );

    return this.prisma.productIntelligence.upsert({
      where: {
        productId,
      },
      create: {
        productId,

        aiGeneratedTitle: data.aiGeneratedTitle ?? null,
        aiGeneratedShortDesc: data.aiGeneratedShortDesc ?? null,
        aiGeneratedDescription:
          data.aiGeneratedDescription ?? null,

        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        seoKeywords: data.seoKeywords ?? [],

        storyTitle: data.storyTitle ?? null,
        storyText: data.storyText ?? null,

        howToUse: data.howToUse ?? null,
        warnings: data.warnings ?? null,

        suitableFor: data.suitableFor ?? [],
        ingredients: data.ingredients ?? [],
        benefits: data.benefits ?? [],

        complementaryProductIds:
          data.complementaryProductIds ?? [],
      },
      update: {
        aiGeneratedTitle: data.aiGeneratedTitle,
        aiGeneratedShortDesc: data.aiGeneratedShortDesc,
        aiGeneratedDescription: data.aiGeneratedDescription,

        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoKeywords: data.seoKeywords,

        storyTitle: data.storyTitle,
        storyText: data.storyText,

        howToUse: data.howToUse,
        warnings: data.warnings,

        suitableFor: data.suitableFor,
        ingredients: data.ingredients,
        benefits: data.benefits,

        complementaryProductIds:
          data.complementaryProductIds,
      },
      include: this.intelligenceInclude(),
    });
  }

  async remove(id: number) {
    const intelligence =
      await this.prisma.productIntelligence.findUnique({
        where: { id },
      });

    if (!intelligence) {
      throw new NotFoundException(
        'Product intelligence not found',
      );
    }

    return this.prisma.productIntelligence.delete({
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

  private async validateComplementaryProducts(
    productId: number,
    complementaryProductIds: number[],
  ) {
    if (!complementaryProductIds.length) {
      return;
    }

    if (complementaryProductIds.includes(productId)) {
      throw new BadRequestException(
        'Product cannot be complementary to itself',
      );
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: complementaryProductIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (products.length !== complementaryProductIds.length) {
      throw new BadRequestException(
        'One or more complementary products do not exist',
      );
    }
  }

  private intelligenceInclude() {
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