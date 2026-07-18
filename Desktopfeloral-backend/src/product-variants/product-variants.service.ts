import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import {
  PublicProductVariantsQueryDto,
  QueryProductVariantsDto,
  QueryStockMovementsDto,
} from './dto/query-product-variants.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateProductVariantDto) {
    await this.assertActiveProduct(dto.productId);
    this.assertValidPrices(dto.price, dto.salePrice);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const variant = await transaction.productVariant.create({
          data: {
            title: dto.title.trim(),
            sku: this.normalizeSku(dto.sku),
            volume: dto.volume ?? null,
            barcode: this.cleanBarcode(dto.barcode),
            price: dto.price,
            salePrice: dto.salePrice ?? null,
            stock: dto.stock,
            isActive: dto.isActive ?? true,
            weightGram: dto.weightGram ?? 100,
            lengthCm: dto.lengthCm ?? 10,
            widthCm: dto.widthCm ?? 10,
            heightCm: dto.heightCm ?? 10,
            isFragile: dto.isFragile ?? false,
            isLiquid: dto.isLiquid ?? false,
            productId: dto.productId,
          },
          include: { product: true },
        });

        if (dto.stock !== 0) {
          await transaction.stockMovement.create({
            data: {
              variantId: variant.id,
              actorUserId: actor.id,
              delta: dto.stock,
              balanceBefore: 0,
              balanceAfter: dto.stock,
              reason: 'موجودی اولیه',
              reference: 'variant-create',
            },
          });
        }

        return variant;
      });
    } catch (error: unknown) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  findPublic(query: PublicProductVariantsQueryDto) {
    const search = query.search?.trim();

    return this.prisma.productVariant.findMany({
      where: {
        isActive: true,
        ...(query.productId ? { productId: query.productId } : {}),
        product: {
          isActive: true,
          AND: [
            { OR: [{ brandId: null }, { brand: { isActive: true } }] },
            { OR: [{ categoryId: null }, { category: { isActive: true } }] },
          ],
        },
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search } },
                {
                  product: { name: { contains: search, mode: 'insensitive' } },
                },
              ],
            }
          : {}),
      },
      take: query.limit ?? 100,
      include: { product: true },
      orderBy: { id: 'asc' },
    });
  }

  async findAdmin(query: QueryProductVariantsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const stockWhere =
      query.lowStockBelow !== undefined
        ? { lte: query.lowStockBelow }
        : query.inStock === true
          ? { gt: 0 }
          : query.inStock === false
            ? { equals: 0 }
            : undefined;

    const where: Prisma.ProductVariantWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(stockWhere ? { stock: stockWhere } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search } },
              { product: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.productVariant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: { include: { brand: true, category: true } },
          _count: { select: { orderItems: true, cartItems: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productVariant.count({ where }),
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
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id,
        isActive: true,
        product: { isActive: true },
      },
      include: { product: true },
    });

    if (!variant) throw new NotFoundException('تنوع محصول پیدا نشد');
    return variant;
  }

  async findOneAdmin(id: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: { include: { brand: true, category: true } },
        _count: { select: { orderItems: true, cartItems: true } },
      },
    });

    if (!variant) throw new NotFoundException('تنوع محصول پیدا نشد');
    return variant;
  }

  async update(id: number, dto: UpdateProductVariantDto) {
    const current = await this.findOneAdmin(id);

    if (dto.productId !== undefined) {
      await this.assertActiveProduct(dto.productId);
    }

    const nextPrice = dto.price ?? Number(current.price);
    const nextSalePrice =
      dto.salePrice !== undefined
        ? dto.salePrice
        : current.salePrice === null
          ? undefined
          : Number(current.salePrice);
    this.assertValidPrices(nextPrice, nextSalePrice);

    try {
      return await this.prisma.productVariant.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.sku !== undefined ? { sku: this.normalizeSku(dto.sku) } : {}),
          ...(dto.volume !== undefined ? { volume: dto.volume } : {}),
          ...(dto.barcode !== undefined
            ? { barcode: this.cleanBarcode(dto.barcode) }
            : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.weightGram !== undefined
            ? { weightGram: dto.weightGram }
            : {}),
          ...(dto.lengthCm !== undefined ? { lengthCm: dto.lengthCm } : {}),
          ...(dto.widthCm !== undefined ? { widthCm: dto.widthCm } : {}),
          ...(dto.heightCm !== undefined ? { heightCm: dto.heightCm } : {}),
          ...(dto.isFragile !== undefined ? { isFragile: dto.isFragile } : {}),
          ...(dto.isLiquid !== undefined ? { isLiquid: dto.isLiquid } : {}),
          ...(dto.productId !== undefined ? { productId: dto.productId } : {}),
        },
        include: { product: true },
      });
    } catch (error: unknown) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  async deactivate(id: number) {
    const variant = await this.findOneAdmin(id);

    if (!variant.isActive) {
      return { message: 'تنوع محصول از قبل غیرفعال است', variant };
    }

    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: { isActive: false },
      include: { product: true },
    });

    return { message: 'تنوع محصول غیرفعال شد', variant: updated };
  }

  async adjustStock(actor: AuthenticatedUser, id: number, dto: AdjustStockDto) {
    if (dto.delta === 0) {
      throw new BadRequestException('مقدار تغییر موجودی نمی‌تواند صفر باشد');
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            const current = await transaction.productVariant.findUnique({
              where: { id },
              select: { id: true, stock: true, sku: true },
            });

            if (!current) {
              throw new NotFoundException('تنوع محصول پیدا نشد');
            }

            const nextStock = current.stock + dto.delta;
            if (nextStock < 0) {
              throw new BadRequestException(
                `موجودی نمی‌تواند منفی شود؛ موجودی فعلی ${current.stock} است`,
              );
            }

            const variant = await transaction.productVariant.update({
              where: { id },
              data: { stock: nextStock },
              include: { product: true },
            });

            const movement = await transaction.stockMovement.create({
              data: {
                variantId: id,
                actorUserId: actor.id,
                delta: dto.delta,
                balanceBefore: current.stock,
                balanceAfter: nextStock,
                reason: this.cleanNullableText(dto.reason),
                reference: this.cleanNullableText(dto.reference),
              },
            });

            return { variant, movement };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 3
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('تغییر موجودی به‌دلیل هم‌زمانی انجام نشد');
  }

  async listStockMovements(id: number, query: QueryStockMovementsDto) {
    await this.findOneAdmin(id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.StockMovementWhereInput = { variantId: id };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
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

  private async assertActiveProduct(productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });

    if (!product) throw new NotFoundException('محصول فعال پیدا نشد');
  }

  private assertValidPrices(price: number, salePrice?: number | null) {
    if (price < 0) throw new BadRequestException('قیمت نمی‌تواند منفی باشد');
    if (salePrice !== undefined && salePrice !== null && salePrice > price) {
      throw new BadRequestException(
        'قیمت فروش ویژه نمی‌تواند از قیمت اصلی بیشتر باشد',
      );
    }
  }

  private normalizeSku(value: string) {
    return value.trim().toUpperCase();
  }

  private cleanBarcode(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private cleanNullableText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private handleUniqueConflict(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('SKU یا بارکد قبلاً استفاده شده است');
    }
  }
}
