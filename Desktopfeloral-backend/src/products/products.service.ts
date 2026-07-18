import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  PublicProductsQueryDto,
  QueryProductsDto,
} from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_PUBLIC_INCLUDE = {
  brand: true,
  category: true,
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
  },
  variants: {
    where: { isActive: true },
    orderBy: { id: 'asc' as const },
  },
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    await this.assertActiveRelations(dto.brandId, dto.categoryId);

    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name.trim(),
          englishName: this.cleanNullableText(dto.englishName),
          slug: this.normalizeSlug(dto.slug),
          description: this.cleanNullableText(dto.description),
          shortDesc: this.cleanNullableText(dto.shortDesc),
          brandId: dto.brandId ?? null,
          categoryId: dto.categoryId ?? null,
          isActive: dto.isActive ?? true,
        },
        include: PRODUCT_PUBLIC_INCLUDE,
      });
    } catch (error: unknown) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  findPublic(query: PublicProductsQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      AND: [
        { OR: [{ brandId: null }, { brand: { isActive: true } }] },
        { OR: [{ categoryId: null }, { category: { isActive: true } }] },
      ],
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { englishName: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              {
                variants: {
                  some: {
                    isActive: true,
                    OR: [
                      { sku: { contains: search, mode: 'insensitive' } },
                      { barcode: { contains: search } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.product.findMany({
      where,
      take: query.limit ?? 100,
      include: PRODUCT_PUBLIC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAdmin(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const where: Prisma.ProductWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { englishName: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              {
                variants: {
                  some: {
                    OR: [
                      { sku: { contains: search, mode: 'insensitive' } },
                      { barcode: { contains: search } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          brand: true,
          category: true,
          images: {
            orderBy: [
              { isPrimary: 'desc' as const },
              { sortOrder: 'asc' as const },
            ],
          },
          variants: { orderBy: { id: 'asc' } },
          _count: {
            select: {
              variants: true,
              images: true,
              orderItems: true,
              cartItems: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOnePublic(id: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
        AND: [
          { OR: [{ brandId: null }, { brand: { isActive: true } }] },
          { OR: [{ categoryId: null }, { category: { isActive: true } }] },
        ],
      },
      include: PRODUCT_PUBLIC_INCLUDE,
    });

    if (!product) throw new NotFoundException('محصول پیدا نشد');
    return product;
  }

  async findOneAdmin(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        images: {
          orderBy: [
            { isPrimary: 'desc' as const },
            { sortOrder: 'asc' as const },
          ],
        },
        variants: { orderBy: { id: 'asc' } },
        _count: {
          select: {
            orderItems: true,
            cartItems: true,
          },
        },
      },
    });

    if (!product) throw new NotFoundException('محصول پیدا نشد');
    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOneAdmin(id);
    await this.assertActiveRelations(dto.brandId, dto.categoryId);

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.englishName !== undefined
            ? { englishName: this.cleanNullableText(dto.englishName) }
            : {}),
          ...(dto.slug !== undefined
            ? { slug: this.normalizeSlug(dto.slug) }
            : {}),
          ...(dto.description !== undefined
            ? { description: this.cleanNullableText(dto.description) }
            : {}),
          ...(dto.shortDesc !== undefined
            ? { shortDesc: this.cleanNullableText(dto.shortDesc) }
            : {}),
          ...(dto.brandId !== undefined ? { brandId: dto.brandId } : {}),
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: PRODUCT_PUBLIC_INCLUDE,
      });
    } catch (error: unknown) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  async deactivate(id: number) {
    const product = await this.findOneAdmin(id);

    if (!product.isActive) {
      return { message: 'محصول از قبل غیرفعال است', product };
    }

    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.productVariant.updateMany({
        where: { productId: id, isActive: true },
        data: { isActive: false },
      });

      return transaction.product.update({
        where: { id },
        data: { isActive: false },
        include: PRODUCT_PUBLIC_INCLUDE,
      });
    });

    return {
      message: 'محصول و تنوع‌های فعال آن غیرفعال شدند',
      product: updated,
    };
  }

  private async assertActiveRelations(
    brandId?: number | null,
    categoryId?: number | null,
  ) {
    if (brandId !== undefined && brandId !== null) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: brandId, isActive: true },
        select: { id: true },
      });
      if (!brand) throw new NotFoundException('برند فعال پیدا نشد');
    }

    if (categoryId !== undefined && categoryId !== null) {
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, isActive: true },
        select: { id: true },
      });
      if (!category) throw new NotFoundException('دسته‌بندی فعال پیدا نشد');
    }
  }

  private normalizeSlug(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, '-');
  }

  private cleanNullableText(value?: string | null) {
    if (value === undefined) return undefined;
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private handleUniqueConflict(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('اسلاگ محصول قبلاً استفاده شده است');
    }
  }
}
