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

  handleUploadedFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('فایل تصویر الزامی است');
    }

    return {
      success: true,
      message: 'تصویر با موفقیت آپلود شد',
      filename: file.filename,
      imageUrl: `/uploads/products/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  private formatImage(image: any) {
    return {
      id: image.id,
      imageUrl: image.imageUrl,
      alt: image.alt,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
      productId: image.productId,
      product: image.product
        ? {
            id: image.product.id,
            name: image.product.name,
            englishName: image.product.englishName,
            slug: image.product.slug,
            isActive: image.product.isActive,
          }
        : null,
      createdAt: image.createdAt,
    };
  }

  private async ensureProductExists(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      throw new BadRequestException('محصول پیدا نشد');
    }

    return product;
  }

  private async findImageOrFail(id: number) {
    const image = await this.prisma.productImage.findUnique({
      where: {
        id,
      },
      include: {
        product: true,
      },
    });

    if (!image) {
      throw new NotFoundException('تصویر محصول پیدا نشد');
    }

    return image;
  }

  async create(data: CreateProductImageDto) {
    await this.ensureProductExists(data.productId);

    const imagesCount = await this.prisma.productImage.count({
      where: {
        productId: data.productId,
      },
    });

    const shouldBePrimary = data.isPrimary === true || imagesCount === 0;

    const image = await this.prisma.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.productImage.updateMany({
          where: {
            productId: data.productId,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.productImage.create({
        data: {
          imageUrl: data.imageUrl,
          productId: data.productId,
          alt: data.alt ?? null,
          isPrimary: shouldBePrimary,
          sortOrder: data.sortOrder ?? 0,
        },
        include: {
          product: true,
        },
      });
    });

    return {
      message: 'تصویر محصول با موفقیت ثبت شد',
      image: this.formatImage(image),
    };
  }

  async findAll() {
    const images = await this.prisma.productImage.findMany({
      include: {
        product: true,
      },
      orderBy: [
        {
          productId: 'asc',
        },
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
    });

    return {
      data: images.map((image) => this.formatImage(image)),
      meta: {
        total: images.length,
      },
    };
  }

  async findByProduct(productId: number) {
    await this.ensureProductExists(productId);

    const images = await this.prisma.productImage.findMany({
      where: {
        productId,
      },
      include: {
        product: true,
      },
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
    });

    return {
      data: images.map((image) => this.formatImage(image)),
      meta: {
        productId,
        total: images.length,
      },
    };
  }

  async findOne(id: number) {
    const image = await this.findImageOrFail(id);

    return this.formatImage(image);
  }

  async update(id: number, data: UpdateProductImageDto) {
    const currentImage = await this.findImageOrFail(id);

    const finalProductId = data.productId ?? currentImage.productId;

    if (data.productId) {
      await this.ensureProductExists(data.productId);
    }

    const image = await this.prisma.$transaction(async (tx) => {
      if (data.isPrimary === true) {
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
      }

      return tx.productImage.update({
        where: {
          id,
        },
        data: {
          imageUrl: data.imageUrl,
          productId: data.productId,
          alt: data.alt,
          isPrimary: data.isPrimary,
          sortOrder: data.sortOrder,
        },
        include: {
          product: true,
        },
      });
    });

    return {
      message: 'تصویر محصول با موفقیت ویرایش شد',
      image: this.formatImage(image),
    };
  }

  async setPrimary(id: number) {
    const currentImage = await this.findImageOrFail(id);

    const image = await this.prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({
        where: {
          productId: currentImage.productId,
        },
        data: {
          isPrimary: false,
        },
      });

      return tx.productImage.update({
        where: {
          id,
        },
        data: {
          isPrimary: true,
        },
        include: {
          product: true,
        },
      });
    });

    return {
      message: 'تصویر اصلی محصول با موفقیت تغییر کرد',
      image: this.formatImage(image),
    };
  }

  async remove(id: number) {
    const currentImage = await this.findImageOrFail(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({
        where: {
          id,
        },
      });

      if (currentImage.isPrimary) {
        const nextImage = await tx.productImage.findFirst({
          where: {
            productId: currentImage.productId,
          },
          orderBy: [
            {
              sortOrder: 'asc',
            },
            {
              id: 'asc',
            },
          ],
        });

        if (nextImage) {
          await tx.productImage.update({
            where: {
              id: nextImage.id,
            },
            data: {
              isPrimary: true,
            },
          });
        }
      }
    });

    return {
      message: 'تصویر محصول با موفقیت حذف شد',
    };
  }
}