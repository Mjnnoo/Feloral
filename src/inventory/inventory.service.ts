import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateVariantStockDto } from './dto/update-variant-stock.dto';
import { UpdateVariantPriceDto } from './dto/update-variant-price.dto';
import { UpdateVariantActiveDto } from './dto/update-variant-active.dto';

type VariantListQuery = {
  page?: string;
  limit?: string;
  search?: string;
  productId?: string;
  brandId?: string;
  categoryId?: string;
  isActive?: string;
};

type LowStockQuery = {
  threshold?: string;
  limit?: string;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(
    value: unknown,
    fallback: number,
    min?: number,
    max?: number,
  ) {
    const number = Number(value);

    if (Number.isNaN(number) || number < 0) {
      return fallback;
    }

    if (min !== undefined && number < min) {
      return min;
    }

    if (max !== undefined && number > max) {
      return max;
    }

    return number;
  }

  private parsePositiveNumber(value?: string, fieldName?: string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const number = Number(value);

    if (Number.isNaN(number) || number <= 0) {
      throw new BadRequestException(`${fieldName ?? 'شناسه'} باید عدد معتبر باشد`);
    }

    return number;
  }

  private parseBoolean(value?: string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    throw new BadRequestException('مقدار isActive باید true یا false باشد');
  }

  private formatVariant(variant: any) {
    const price = Number(variant.price);
    const salePrice =
      variant.salePrice !== null && variant.salePrice !== undefined
        ? Number(variant.salePrice)
        : null;

    const finalPrice = salePrice !== null && salePrice < price ? salePrice : price;

    const discountPercent =
      salePrice !== null && salePrice < price && price > 0
        ? Math.round(((price - salePrice) / price) * 100)
        : 0;

    const primaryImage = variant.product?.images?.[0] ?? null;

    return {
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      volume: variant.volume,
      barcode: variant.barcode,

      price,
      salePrice,
      finalPrice,
      discountPercent,

      stock: variant.stock,
      isLowStock: variant.stock <= 5,
      isOutOfStock: variant.stock <= 0,
      isActive: variant.isActive,

      productId: variant.productId,

      product: variant.product
        ? {
            id: variant.product.id,
            name: variant.product.name,
            englishName: variant.product.englishName,
            slug: variant.product.slug,
            isActive: variant.product.isActive,
            image: primaryImage,

            brand: variant.product.brand
              ? {
                  id: variant.product.brand.id,
                  name: variant.product.brand.name,
                  slug: variant.product.brand.slug,
                }
              : null,

            category: variant.product.category
              ? {
                  id: variant.product.category.id,
                  name: variant.product.category.name,
                  slug: variant.product.category.slug,
                }
              : null,
          }
        : null,

      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  }

  private getVariantInclude() {
    return {
      product: {
        select: {
          id: true,
          name: true,
          englishName: true,
          slug: true,
          isActive: true,

          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          images: {
            orderBy: [
              {
                isPrimary: 'desc' as const,
              },
              {
                sortOrder: 'asc' as const,
              },
              {
                id: 'asc' as const,
              },
            ],
            take: 1,
          },
        },
      },
    };
  }

  private async findVariantOrFail(id: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: {
        id,
      },
      include: this.getVariantInclude(),
    });

    if (!variant) {
      throw new NotFoundException('تنوع محصول پیدا نشد');
    }

    return variant;
  }

  async getVariants(query: VariantListQuery) {
    const page = this.toNumber(query.page, 1, 1, 100000);
    const limit = this.toNumber(query.limit, 20, 1, 100);
    const skip = (page - 1) * limit;

    const productId = this.parsePositiveNumber(query.productId, 'شناسه محصول');
    const brandId = this.parsePositiveNumber(query.brandId, 'شناسه برند');
    const categoryId = this.parsePositiveNumber(
      query.categoryId,
      'شناسه دسته‌بندی',
    );
    const isActive = this.parseBoolean(query.isActive);
    const search = query.search?.trim();

    const where: Prisma.ProductVariantWhereInput = {};

    if (productId !== undefined) {
      where.productId = productId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (brandId !== undefined || categoryId !== undefined) {
      where.product = {};

      if (brandId !== undefined) {
        where.product.brandId = brandId;
      }

      if (categoryId !== undefined) {
        where.product.categoryId = categoryId;
      }
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          sku: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          barcode: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          product: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          product: {
            englishName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [total, variants] = await Promise.all([
      this.prisma.productVariant.count({
        where,
      }),

      this.prisma.productVariant.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          {
            stock: 'asc',
          },
          {
            id: 'desc',
          },
        ],
        include: this.getVariantInclude(),
      }),
    ]);

    return {
      data: variants.map((variant) => this.formatVariant(variant)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLowStock(query: LowStockQuery) {
    const threshold = this.toNumber(query.threshold, 5, 0, 1000);
    const limit = this.toNumber(query.limit, 20, 1, 100);

    const variants = await this.prisma.productVariant.findMany({
      where: {
        stock: {
          lte: threshold,
        },
      },
      take: limit,
      orderBy: [
        {
          stock: 'asc',
        },
        {
          id: 'desc',
        },
      ],
      include: this.getVariantInclude(),
    });

    return {
      data: variants.map((variant) => ({
        ...this.formatVariant(variant),
        threshold,
      })),
      meta: {
        threshold,
        limit,
        total: variants.length,
      },
    };
  }

  async updateStock(id: number, dto: UpdateVariantStockDto) {
    await this.findVariantOrFail(id);

    const variant = await this.prisma.productVariant.update({
      where: {
        id,
      },
      data: {
        stock: dto.stock,
      },
      include: this.getVariantInclude(),
    });

    return {
      message: 'موجودی محصول با موفقیت تغییر کرد',
      variant: this.formatVariant(variant),
    };
  }

  async updatePrice(id: number, dto: UpdateVariantPriceDto) {
    await this.findVariantOrFail(id);

    if (
      dto.salePrice !== undefined &&
      dto.salePrice !== null &&
      dto.salePrice > dto.price
    ) {
      throw new BadRequestException(
        'قیمت تخفیفی نمی‌تواند بیشتر از قیمت اصلی باشد',
      );
    }

    const variant = await this.prisma.productVariant.update({
      where: {
        id,
      },
      data: {
        price: dto.price,
        salePrice:
          dto.salePrice !== undefined && dto.salePrice !== null
            ? dto.salePrice
            : null,
      },
      include: this.getVariantInclude(),
    });

    return {
      message: 'قیمت محصول با موفقیت تغییر کرد',
      variant: this.formatVariant(variant),
    };
  }

  async updateActive(id: number, dto: UpdateVariantActiveDto) {
    await this.findVariantOrFail(id);

    const variant = await this.prisma.productVariant.update({
      where: {
        id,
      },
      data: {
        isActive: dto.isActive,
      },
      include: this.getVariantInclude(),
    });

    return {
      message: dto.isActive
        ? 'تنوع محصول با موفقیت فعال شد'
        : 'تنوع محصول با موفقیت غیرفعال شد',
      variant: this.formatVariant(variant),
    };
  }
}