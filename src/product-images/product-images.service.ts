import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

@Injectable()
export class ProductImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductImageDto) {
    await this.ensureProductExists(data.productId);

    if (data.isPrimary) {
      return this.prisma.$transaction(async (tx) => {
        await tx.productImage.updateMany({
          where: {
            productId: data.productId,
          },
          data: {
            isPrimary: false,
          },
        });

        return tx.productImage.create({
          data: {
            imageUrl: data.imageUrl,
            productId: data.productId,
            alt: data.alt ?? null,
            isPrimary: true,
            sortOrder: data.sortOrder ?? 0,
          },
          include: {
            product: true,
          },
        });
      });
    }

    return this.prisma.productImage.create({
      data: {
        imageUrl: data.imageUrl,
        productId: data.productId,
        alt: data.alt ?? null,
        isPrimary: data.isPrimary ?? false,
        sortOrder: data.sortOrder ?? 0,
      },
      include: {
        product: true,
      },
    });
  }

  findAll() {
    return this.prisma.productImage.findMany({
      include: {
        product: true,
      },
      orderBy: [
        {
          productId: 'asc',
        },
        {
          sortOrder: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  }

  async findOne(id: number) {
    const image = await this.prisma.productImage.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    return image;
  }

  async update(id: number, data: UpdateProductImageDto) {
    const currentImage = await this.findOne(id);

    const finalProductId = data.productId ?? currentImage.productId;

    if (data.productId) {
      await this.ensureProductExists(data.productId);
    }

    if (data.isPrimary) {
      return this.prisma.$transaction(async (tx) => {
        await tx.productImage.updateMany({
          where: {
            productId: finalProductId,
            id: {
              not: id,
            },
          },
          data: {
            isPrimary: false,
          },
        });

        return tx.productImage.update({
          where: { id },
          data: {
            ...data,
            isPrimary: true,
          },
          include: {
            product: true,
          },
        });
      });
    }

    return this.prisma.productImage.update({
      where: { id },
      data,
      include: {
        product: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.productImage.delete({
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
}