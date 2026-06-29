import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductVariantDto) {
    await this.ensureProductExists(data.productId);

    if (
      typeof data.salePrice === 'number' &&
      data.salePrice > data.price
    ) {
      throw new BadRequestException('Sale price cannot be greater than price');
    }

    try {
      return await this.prisma.productVariant.create({
        data: {
          title: data.title,
          sku: data.sku,
          volume: data.volume ?? null,
          barcode: data.barcode ?? null,
          price: data.price,
          salePrice: data.salePrice ?? null,
          stock: data.stock,
          isActive: data.isActive ?? true,
          productId: data.productId,
        },
        include: {
          product: {
            include: {
              brand: true,
              category: true,
            },
          },
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll() {
    return this.prisma.productVariant.findMany({
      include: {
        product: {
          include: {
            brand: true,
            category: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            brand: true,
            category: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    return variant;
  }

  async update(id: number, data: UpdateProductVariantDto) {
    const currentVariant = await this.findOne(id);

    if (data.productId) {
      await this.ensureProductExists(data.productId);
    }

    const finalPrice =
      typeof data.price === 'number'
        ? data.price
        : Number(currentVariant.price);

    const finalSalePrice =
      typeof data.salePrice === 'number'
        ? data.salePrice
        : currentVariant.salePrice
          ? Number(currentVariant.salePrice)
          : undefined;

    if (
      typeof finalSalePrice === 'number' &&
      finalSalePrice > finalPrice
    ) {
      throw new BadRequestException('Sale price cannot be greater than price');
    }

    try {
      return await this.prisma.productVariant.update({
        where: { id },
        data,
        include: {
          product: {
            include: {
              brand: true,
              category: true,
            },
          },
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.productVariant.delete({
      where: { id },
    });
  }

  private async ensureProductExists(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('SKU or barcode already exists');
    }

    throw error;
  }
}