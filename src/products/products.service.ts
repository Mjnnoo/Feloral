import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductDto) {
    try {
      await this.ensureBrandExists(data.brandId);
      await this.ensureCategoryExists(data.categoryId);

      const product = await this.prisma.product.create({
        data: {
          name: data.name,
          englishName: data.englishName ?? null,
          slug: data.slug,
          description: data.description ?? null,
          shortDesc: data.shortDesc ?? null,
          isActive: data.isActive ?? true,
          brandId: data.brandId,
          categoryId: data.categoryId,
        },
        include: this.fullProductInclude(),
      });

      return product;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: ProductQueryDto) {
    const page = this.parsePositiveNumber(
      (query as any).page,
      1,
    );

    const limit = this.parsePositiveNumber(
      (query as any).limit,
      12,
    );

    const search = (query as any).search;
    const brandId = this.parseOptionalNumber(
      (query as any).brandId,
    );
    const categoryId = this.parseOptionalNumber(
      (query as any).categoryId,
    );
    const isActive = this.parseOptionalBoolean(
      (query as any).isActive,
    );

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          englishName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          slug: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({
        where,
      }),
      this.prisma.product.findMany({
        where,
        include: this.fullProductInclude(),
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: {
        id,
      },
      include: this.fullProductInclude(),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: number, data: UpdateProductDto) {
    try {
      await this.findOne(id);

      if (data.brandId) {
        await this.ensureBrandExists(data.brandId);
      }

      if (data.categoryId) {
        await this.ensureCategoryExists(data.categoryId);
      }

      const product = await this.prisma.product.update({
        where: {
          id,
        },
        data: {
          name: data.name,
          englishName: data.englishName,
          slug: data.slug,
          description: data.description,
          shortDesc: data.shortDesc,
          isActive: data.isActive,
          brandId: data.brandId,
          categoryId: data.categoryId,
        },
        include: this.fullProductInclude(),
      });

      return product;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    /*
      Enterprise-safe delete:
      محصول را پاک فیزیکی نمی‌کنیم، چون ممکن است در سفارش‌ها،
      گزارش‌ها، سبد خرید یا تحلیل‌ها استفاده شده باشد.
    */
    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
      include: this.fullProductInclude(),
    });
  }

  private async ensureBrandExists(brandId: number) {
    const brand = await this.prisma.brand.findUnique({
      where: {
        id: brandId,
      },
      select: {
        id: true,
      },
    });

    if (!brand) {
      throw new BadRequestException('Brand not found');
    }

    return brand;
  }

  private async ensureCategoryExists(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    return category;
  }

  private fullProductInclude(): Prisma.ProductInclude {
    return {
      brand: true,
      category: true,

      images: {
        orderBy: [
          {
            isPrimary: 'desc',
          },
          {
            sortOrder: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      },

      variants: {
        orderBy: {
          id: 'asc',
        },
        include: {
          shade: true,
        },
      },

      shades: {
        orderBy: [
          {
            sortOrder: 'asc',
          },
          {
            id: 'asc',
          },
        ],
        include: {
          variant: {
            select: {
              id: true,
              title: true,
              sku: true,
              price: true,
              salePrice: true,
              stock: true,
              isActive: true,
            },
          },
        },
      },

      intelligence: true,
      experience: true,
      priceInsight: true,
    };
  }

  private parsePositiveNumber(
    value: unknown,
    defaultValue: number,
  ) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return defaultValue;
    }

    return parsed;
  }

  private parseOptionalNumber(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return undefined;
    }

    return parsed;
  }

  private parseOptionalBoolean(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return undefined;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Product slug or unique field already exists',
        );
      }
    }

    throw error;
  }
}