import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProductShadeDto } from './dto/create-product-shade.dto';
import { UpdateProductShadeDto } from './dto/update-product-shade.dto';

@Injectable()
export class ProductShadesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductShadeDto) {
    await this.ensureProductExists(data.productId);

    if (data.variantId) {
      await this.ensureVariantBelongsToProduct(
        data.variantId,
        data.productId,
      );
    }

    return this.prisma.productShade.create({
      data: {
        productId: data.productId,
        variantId: data.variantId ?? null,
        name: data.name,
        code: data.code ?? null,
        hexColor: data.hexColor,
        region: data.region,
        finish: data.finish ?? null,
        opacity: data.opacity ?? 1,
        previewImage: data.previewImage ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
      include: this.shadeInclude(),
    });
  }

  async findAll() {
    return this.prisma.productShade.findMany({
      include: this.shadeInclude(),
      orderBy: [
        { productId: 'asc' },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async findByProduct(productId: number) {
    await this.ensureProductExists(productId);

    return this.prisma.productShade.findMany({
      where: {
        productId,
        isActive: true,
      },
      include: {
        variant: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async findOne(id: number) {
    const shade = await this.prisma.productShade.findUnique({
      where: { id },
      include: this.shadeInclude(),
    });

    if (!shade) {
      throw new NotFoundException('Product shade not found');
    }

    return shade;
  }

  async update(id: number, data: UpdateProductShadeDto) {
    const currentShade = await this.findOne(id);

    const productId = data.productId ?? currentShade.productId;

    if (data.productId) {
      await this.ensureProductExists(data.productId);
    }

    if (data.variantId) {
      await this.ensureVariantBelongsToProduct(
        data.variantId,
        productId,
      );
    }

    return this.prisma.productShade.update({
      where: { id },
      data: {
        productId: data.productId,
        variantId: data.variantId,
        name: data.name,
        code: data.code,
        hexColor: data.hexColor,
        region: data.region,
        finish: data.finish,
        opacity: data.opacity,
        previewImage: data.previewImage,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
      include: this.shadeInclude(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.productShade.delete({
      where: { id },
    });
  }

  private async ensureProductExists(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async ensureVariantBelongsToProduct(
    variantId: number,
    productId: number,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        productId: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    if (variant.productId !== productId) {
      throw new BadRequestException(
        'Variant does not belong to this product',
      );
    }

    return variant;
  }

  private shadeInclude() {
    return {
      product: {
        select: {
          id: true,
          name: true,
          englishName: true,
          slug: true,
        },
      },
      variant: {
        select: {
          id: true,
          title: true,
          sku: true,
          price: true,
          salePrice: true,
          stock: true,
        },
      },
    };
  }
}