import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendationsForMe(
    userId: number,
    query: RecommendationQueryDto,
  ) {
    const limit = query.limit && query.limit > 0 ? query.limit : 10;

    const profile = await this.prisma.beautyProfile.findUnique({
      where: {
        userId,
      },
    });

    if (!profile) {
      throw new NotFoundException(
        'Beauty profile not found. Please create your beauty profile first.',
      );
    }

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: this.productInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    const scoredProducts = products
      .map((product) =>
        this.scoreProductForProfile(
          product,
          profile,
          query,
        ),
      )
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      userId,
      profile: {
        skinType: profile.skinType,
        undertone: profile.undertone,
        scentFamilies: profile.scentFamilies,
        favoriteNotes: profile.favoriteNotes,
        allergies: profile.allergies,
        preferredBrands: profile.preferredBrands,
        budgetMin: this.toNumber(profile.budgetMin),
        budgetMax: this.toNumber(profile.budgetMax),
        beautyGoals: profile.beautyGoals,
      },
      count: scoredProducts.length,
      recommendations: scoredProducts,
    };
  }

  async getSimilarProducts(productId: number, limit = 8) {
    const baseProduct = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: this.productInclude(),
    });

    if (!baseProduct) {
      throw new NotFoundException('Product not found');
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          not: productId,
        },
        isActive: true,
      },
      include: this.productInclude(),
    });

    const scoredProducts = products
      .map((product) =>
        this.scoreSimilarProduct(product, baseProduct),
      )
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      productId,
      baseProduct: {
        id: baseProduct.id,
        name: baseProduct.name,
        englishName: baseProduct.englishName,
        slug: baseProduct.slug,
      },
      count: scoredProducts.length,
      recommendations: scoredProducts,
    };
  }

  private scoreProductForProfile(
    product: any,
    profile: any,
    query: RecommendationQueryDto,
  ) {
    let score = 0;
    const reasons: string[] = [];

    const bestPrice = this.getBestPrice(product);

    if (profile.preferredBrands?.length) {
      const brandName = product.brand?.name?.toLowerCase();

      const brandMatched = profile.preferredBrands.some(
        (brand: string) =>
          brandName === brand.toLowerCase(),
      );

      if (brandMatched) {
        score += 20;
        reasons.push('برند محصول در برندهای مورد علاقه شماست');
      }
    }

    if (profile.skinType && product.experience?.skinTypes?.length) {
      const skinMatched = product.experience.skinTypes.some(
        (skinType: string) =>
          skinType.toLowerCase() ===
          profile.skinType.toLowerCase(),
      );

      if (skinMatched) {
        score += 25;
        reasons.push('با نوع پوست شما سازگار است');
      }
    }

    if (profile.beautyGoals?.length) {
      const searchableText = [
        ...(product.intelligence?.benefits ?? []),
        ...(product.intelligence?.suitableFor ?? []),
        product.intelligence?.aiGeneratedTitle,
        product.intelligence?.aiGeneratedShortDesc,
        product.intelligence?.aiGeneratedDescription,
        product.intelligence?.storyText,
        product.experience?.routineStep,
        product.experience?.texture,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchedGoals = profile.beautyGoals.filter(
        (goal: string) =>
          searchableText.includes(goal.toLowerCase()),
      );

      if (matchedGoals.length) {
        score += 15 + matchedGoals.length * 5;
        reasons.push('با اهداف زیبایی شما هماهنگ است');
      }
    }

    if (profile.scentFamilies?.length) {
      const scentFamily =
        product.experience?.scentFamily?.toLowerCase();

      if (
        scentFamily &&
        profile.scentFamilies.some(
          (family: string) =>
            family.toLowerCase() === scentFamily,
        )
      ) {
        score += 20;
        reasons.push('با خانواده رایحه مورد علاقه شما هماهنگ است');
      }
    }

    if (profile.favoriteNotes?.length) {
      const notes = [
        ...(product.experience?.topNotes ?? []),
        ...(product.experience?.middleNotes ?? []),
        ...(product.experience?.baseNotes ?? []),
      ].map((note: string) => note.toLowerCase());

      const matchedNotes = profile.favoriteNotes.filter(
        (note: string) =>
          notes.includes(note.toLowerCase()),
      );

      if (matchedNotes.length) {
        score += 10 + matchedNotes.length * 5;
        reasons.push('نت‌های مورد علاقه شما در این محصول دیده می‌شود');
      }
    }

    if (
      bestPrice !== null &&
      profile.budgetMin !== null &&
      profile.budgetMax !== null
    ) {
      const budgetMin = this.toNumber(profile.budgetMin);
      const budgetMax = this.toNumber(profile.budgetMax);

      if (
        bestPrice >= budgetMin &&
        bestPrice <= budgetMax
      ) {
        score += 15;
        reasons.push('در محدوده بودجه شما قرار دارد');
      }
    }

    if (query.goal) {
      const goal = query.goal.toLowerCase();

      const searchableText = [
        product.name,
        product.englishName,
        product.description,
        product.shortDesc,
        product.intelligence?.aiGeneratedTitle,
        product.intelligence?.aiGeneratedDescription,
        ...(product.intelligence?.benefits ?? []),
        ...(product.intelligence?.suitableFor ?? []),
        ...(product.intelligence?.ingredients ?? []),
        product.experience?.routineStep,
        product.experience?.texture,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (searchableText.includes(goal)) {
        score += 15;
        reasons.push('با هدف جستجوی شما هماهنگ است');
      }
    }

    return {
      score,
      reasons,
      product: this.formatProduct(product, bestPrice),
    };
  }

  private scoreSimilarProduct(product: any, baseProduct: any) {
    let score = 0;
    const reasons: string[] = [];

    if (product.categoryId === baseProduct.categoryId) {
      score += 25;
      reasons.push('در همان دسته‌بندی محصول اصلی است');
    }

    if (product.brandId === baseProduct.brandId) {
      score += 20;
      reasons.push('از همان برند محصول اصلی است');
    }

    if (
      product.experience?.routineStep &&
      baseProduct.experience?.routineStep &&
      product.experience.routineStep ===
        baseProduct.experience.routineStep
    ) {
      score += 15;
      reasons.push('در همان مرحله روتین استفاده می‌شود');
    }

    if (
      product.experience?.scentFamily &&
      baseProduct.experience?.scentFamily &&
      product.experience.scentFamily ===
        baseProduct.experience.scentFamily
    ) {
      score += 15;
      reasons.push('خانواده رایحه مشابه دارد');
    }

    const bestPrice = this.getBestPrice(product);

    return {
      score,
      reasons,
      product: this.formatProduct(product, bestPrice),
    };
  }

  private getBestPrice(product: any) {
    if (!product.variants?.length) {
      return null;
    }

    const activePrices = product.variants
      .filter((variant: any) => variant.isActive)
      .map((variant: any) => {
        if (
          variant.salePrice !== null &&
          variant.salePrice !== undefined
        ) {
          return this.toNumber(variant.salePrice);
        }

        return this.toNumber(variant.price);
      })
      .filter((price: number) => price > 0);

    if (!activePrices.length) {
      return null;
    }

    return Math.min(...activePrices);
  }

  private formatProduct(product: any, bestPrice: number | null) {
    const primaryImage =
      product.images?.find((image: any) => image.isPrimary) ??
      product.images?.[0] ??
      null;

    return {
      id: product.id,
      name: product.name,
      englishName: product.englishName,
      slug: product.slug,
      shortDesc: product.shortDesc,
      isActive: product.isActive,

      brand: product.brand,
      category: product.category,

      primaryImage,
      bestPrice,

      variants: product.variants,
      shades: product.shades,
      intelligence: product.intelligence,
      experience: product.experience,
    };
  }

  private productInclude() {
    return {
      brand: true,
      category: true,

      images: {
        orderBy: [
          { isPrimary: 'desc' as const },
          { sortOrder: 'asc' as const },
          { id: 'asc' as const },
        ],
      },

      variants: {
        where: {
          isActive: true,
        },
        orderBy: {
          id: 'asc' as const,
        },
        include: {
          shade: true,
        },
      },

      shades: {
        where: {
          isActive: true,
        },
        orderBy: [
          { sortOrder: 'asc' as const },
          { id: 'asc' as const },
        ],
      },

      intelligence: true,
      experience: true,
    };
  }

  private toNumber(value: any) {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }
}