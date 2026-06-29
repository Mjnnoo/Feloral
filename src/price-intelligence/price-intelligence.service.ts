import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PriceInsightLevel,
  PriceSnapshotSource,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';
import { CreateCompetitorLinkDto } from './dto/create-competitor-link.dto';
import { UpdateCompetitorLinkDto } from './dto/update-competitor-link.dto';
import { CreatePriceSnapshotDto } from './dto/create-price-snapshot.dto';

@Injectable()
export class PriceIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async createCompetitor(data: CreateCompetitorDto) {
    return this.prisma.competitor.create({
      data: {
        name: data.name,
        slug: data.slug,
        websiteUrl: data.websiteUrl ?? null,
        priceSelector: data.priceSelector ?? null,
        salePriceSelector: data.salePriceSelector ?? null,
        titleSelector: data.titleSelector ?? null,
        availabilitySelector: data.availabilitySelector ?? null,
        priceMultiplier: data.priceMultiplier ?? 1,
        isActive: data.isActive ?? true,
      },
    });
  }

  async getCompetitors() {
    return this.prisma.competitor.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getCompetitorById(id: number) {
    const competitor = await this.prisma.competitor.findUnique({
      where: {
        id,
      },
      include: {
        productLinks: true,
      },
    });

    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    return competitor;
  }

  async updateCompetitor(id: number, data: UpdateCompetitorDto) {
    await this.getCompetitorById(id);

    return this.prisma.competitor.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        websiteUrl: data.websiteUrl,
        priceSelector: data.priceSelector,
        salePriceSelector: data.salePriceSelector,
        titleSelector: data.titleSelector,
        availabilitySelector: data.availabilitySelector,
        priceMultiplier: data.priceMultiplier,
        isActive: data.isActive,
      },
    });
  }

  async deleteCompetitor(id: number) {
    await this.getCompetitorById(id);

    return this.prisma.competitor.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }

  async createCompetitorLink(data: CreateCompetitorLinkDto) {
    await this.ensureProductExists(data.productId);
    await this.ensureCompetitorExists(data.competitorId);

    return this.prisma.competitorProductLink.create({
      data: {
        productId: data.productId,
        competitorId: data.competitorId,
        url: data.url,
        title: data.title ?? null,
        externalSku: data.externalSku ?? null,
        isActive: data.isActive ?? true,
      },
      include: this.linkInclude(),
    });
  }

  async getLinksByProduct(productId: number) {
    await this.ensureProductExists(productId);

    return this.prisma.competitorProductLink.findMany({
      where: {
        productId,
      },
      include: this.linkInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getCompetitorLinkById(id: number) {
    const link =
      await this.prisma.competitorProductLink.findUnique({
        where: {
          id,
        },
        include: this.linkInclude(),
      });

    if (!link) {
      throw new NotFoundException('Competitor product link not found');
    }

    return link;
  }

  async updateCompetitorLink(
    id: number,
    data: UpdateCompetitorLinkDto,
  ) {
    await this.getCompetitorLinkById(id);

    if (data.productId) {
      await this.ensureProductExists(data.productId);
    }

    if (data.competitorId) {
      await this.ensureCompetitorExists(data.competitorId);
    }

    return this.prisma.competitorProductLink.update({
      where: {
        id,
      },
      data: {
        productId: data.productId,
        competitorId: data.competitorId,
        url: data.url,
        title: data.title,
        externalSku: data.externalSku,
        isActive: data.isActive,
      },
      include: this.linkInclude(),
    });
  }

  async deleteCompetitorLink(id: number) {
    await this.getCompetitorLinkById(id);

    return this.prisma.competitorProductLink.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
      include: this.linkInclude(),
    });
  }

  async createPriceSnapshot(data: CreatePriceSnapshotDto) {
    const link = await this.getCompetitorLinkById(
      data.competitorProductLinkId,
    );

    if (!link.isActive) {
      throw new BadRequestException(
        'Cannot add price snapshot to inactive competitor link',
      );
    }

    const snapshot = await this.prisma.priceSnapshot.create({
      data: {
        competitorProductLinkId:
          data.competitorProductLinkId,
        price: data.price,
        salePrice: data.salePrice ?? null,
        currency: data.currency ?? 'IRR',
        isAvailable: data.isAvailable ?? true,
        source: data.source ?? PriceSnapshotSource.manual,
      },
      include: {
        competitorProductLink: {
          include: this.linkInclude(),
        },
      },
    });

    await this.analyzeProductPrice(link.productId);

    return snapshot;
  }

  async getSnapshotsByProduct(productId: number) {
    await this.ensureProductExists(productId);

    return this.prisma.priceSnapshot.findMany({
      where: {
        competitorProductLink: {
          productId,
        },
      },
      include: {
        competitorProductLink: {
          include: this.linkInclude(),
        },
      },
      orderBy: {
        capturedAt: 'desc',
      },
    });
  }

  async getInsightByProduct(productId: number) {
    await this.ensureProductExists(productId);

    return this.prisma.productPriceInsight.findUnique({
      where: {
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            englishName: true,
            slug: true,
            brand: true,
            category: true,
            variants: true,
          },
        },
      },
    });
  }

  async getAllInsightsForAdmin() {
    return this.prisma.productPriceInsight.findMany({
      include: {
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
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async analyzeProductPrice(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        variants: {
          where: {
            isActive: true,
          },
        },
        competitorLinks: {
          where: {
            isActive: true,
          },
          include: {
            competitor: true,
            snapshots: {
              where: {
                isAvailable: true,
              },
              orderBy: {
                capturedAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const feloralPrice = this.getBestFeloralPrice(product);

    if (feloralPrice === null) {
      throw new BadRequestException(
        'Product has no active variant price',
      );
    }

    const marketPrices = product.competitorLinks
      .map((link) => {
        const latestSnapshot = link.snapshots[0];

        if (!latestSnapshot) {
          return null;
        }

        return {
          competitor: link.competitor.name,
          linkId: link.id,
          price: this.getEffectivePrice(
            latestSnapshot.price,
            latestSnapshot.salePrice,
          ),
          capturedAt: latestSnapshot.capturedAt,
        };
      })
      .filter(Boolean) as {
      competitor: string;
      linkId: number;
      price: number;
      capturedAt: Date;
    }[];

    if (!marketPrices.length) {
      const insight =
        await this.prisma.productPriceInsight.upsert({
          where: {
            productId,
          },
          create: {
            productId,
            feloralPrice,
            minMarketPrice: null,
            avgMarketPrice: null,
            maxMarketPrice: null,
            suggestedPrice: null,
            insightLevel: PriceInsightLevel.unknown,
            summary:
              'No competitor price data is available for this product yet.',
            recommendedAction:
              'Add competitor links and price snapshots to generate market insight.',
          },
          update: {
            feloralPrice,
            minMarketPrice: null,
            avgMarketPrice: null,
            maxMarketPrice: null,
            suggestedPrice: null,
            insightLevel: PriceInsightLevel.unknown,
            summary:
              'No competitor price data is available for this product yet.',
            recommendedAction:
              'Add competitor links and price snapshots to generate market insight.',
          },
        });

      return {
        insight,
        marketPrices,
      };
    }

    const prices = marketPrices.map((item) => item.price);

    const minMarketPrice = Math.min(...prices);
    const maxMarketPrice = Math.max(...prices);
    const avgMarketPrice =
      prices.reduce((sum, price) => sum + price, 0) /
      prices.length;

    const level = this.getInsightLevel(
      feloralPrice,
      avgMarketPrice,
    );

    const suggestedPrice = this.getSuggestedPrice(
      feloralPrice,
      minMarketPrice,
      avgMarketPrice,
      level,
    );

    const summary = this.buildSummary(
      feloralPrice,
      minMarketPrice,
      avgMarketPrice,
      maxMarketPrice,
      level,
    );

    const recommendedAction =
      this.buildRecommendedAction(level);

    const insight =
      await this.prisma.productPriceInsight.upsert({
        where: {
          productId,
        },
        create: {
          productId,
          feloralPrice,
          minMarketPrice,
          avgMarketPrice,
          maxMarketPrice,
          suggestedPrice,
          insightLevel: level,
          summary,
          recommendedAction,
        },
        update: {
          feloralPrice,
          minMarketPrice,
          avgMarketPrice,
          maxMarketPrice,
          suggestedPrice,
          insightLevel: level,
          summary,
          recommendedAction,
        },
      });

    return {
      insight,
      marketPrices,
    };
  }

  private getBestFeloralPrice(product: any) {
    if (!product.variants?.length) {
      return null;
    }

    const prices = product.variants
      .map((variant: any) => {
        if (
          variant.salePrice !== null &&
          variant.salePrice !== undefined
        ) {
          return Number(variant.salePrice);
        }

        return Number(variant.price);
      })
      .filter((price: number) => price > 0);

    if (!prices.length) {
      return null;
    }

    return Math.min(...prices);
  }

  private getEffectivePrice(price: any, salePrice: any) {
    if (salePrice !== null && salePrice !== undefined) {
      return Number(salePrice);
    }

    return Number(price);
  }

  private getInsightLevel(
    feloralPrice: number,
    avgMarketPrice: number,
  ): PriceInsightLevel {
    const diffPercent =
      ((feloralPrice - avgMarketPrice) / avgMarketPrice) *
      100;

    if (diffPercent < -5) {
      return PriceInsightLevel.low;
    }

    if (diffPercent > 5) {
      return PriceInsightLevel.high;
    }

    return PriceInsightLevel.competitive;
  }

  private getSuggestedPrice(
    feloralPrice: number,
    minMarketPrice: number,
    avgMarketPrice: number,
    level: PriceInsightLevel,
  ) {
    if (level === PriceInsightLevel.high) {
      return Math.round(avgMarketPrice * 0.98);
    }

    if (level === PriceInsightLevel.low) {
      return Math.round(
        Math.min(avgMarketPrice * 0.99, feloralPrice * 1.05),
      );
    }

    return Math.round(feloralPrice);
  }

  private buildSummary(
    feloralPrice: number,
    minMarketPrice: number,
    avgMarketPrice: number,
    maxMarketPrice: number,
    level: PriceInsightLevel,
  ) {
    if (level === PriceInsightLevel.high) {
      return `Feloral price is higher than market average. Feloral: ${feloralPrice}, market avg: ${Math.round(avgMarketPrice)}.`;
    }

    if (level === PriceInsightLevel.low) {
      return `Feloral price is lower than market average. Feloral: ${feloralPrice}, market avg: ${Math.round(avgMarketPrice)}.`;
    }

    return `Feloral price is competitive. Feloral: ${feloralPrice}, market range: ${minMarketPrice} - ${maxMarketPrice}.`;
  }

  private buildRecommendedAction(level: PriceInsightLevel) {
    if (level === PriceInsightLevel.high) {
      return 'Consider reducing price or adding a discount campaign.';
    }

    if (level === PriceInsightLevel.low) {
      return 'Price is attractive. Consider keeping it or slightly increasing if demand is high.';
    }

    return 'Keep current price and monitor competitor changes.';
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

  private async ensureCompetitorExists(competitorId: number) {
    const competitor = await this.prisma.competitor.findUnique({
      where: {
        id: competitorId,
      },
      select: {
        id: true,
      },
    });

    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    return competitor;
  }

  private linkInclude() {
    return {
      product: {
        select: {
          id: true,
          name: true,
          englishName: true,
          slug: true,
        },
      },
      competitor: true,
      snapshots: {
        orderBy: {
          capturedAt: 'desc' as const,
        },
        take: 5,
      },
    };
  }
}