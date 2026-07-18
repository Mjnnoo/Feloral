import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, join, resolve, sep } from 'path';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import {
  PublicProductImagesQueryDto,
  QueryProductImagesDto,
} from './dto/query-product-images.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

@Injectable()
export class ProductImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductImageDto) {
    await this.assertActiveProduct(dto.productId);

    return this.serializableTransaction(async (transaction) => {
      const imageCount = await transaction.productImage.count({
        where: { productId: dto.productId },
      });
      const isPrimary = dto.isPrimary ?? imageCount === 0;

      if (isPrimary) {
        await transaction.productImage.updateMany({
          where: { productId: dto.productId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return transaction.productImage.create({
        data: {
          imageUrl: dto.imageUrl.trim(),
          productId: dto.productId,
          alt: this.cleanNullableText(dto.alt),
          isPrimary,
          sortOrder: dto.sortOrder ?? 0,
        },
        include: { product: true },
      });
    });
  }

  findPublic(query: PublicProductImagesQueryDto) {
    return this.prisma.productImage.findMany({
      where: {
        ...(query.productId ? { productId: query.productId } : {}),
        product: { isActive: true },
      },
      include: { product: true },
      orderBy: [
        { productId: 'asc' },
        { isPrimary: 'desc' },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async findAdmin(query: QueryProductImagesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const where: Prisma.ProductImageWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.isPrimary !== undefined ? { isPrimary: query.isPrimary } : {}),
      ...(query.isActive !== undefined
        ? { product: { isActive: query.isActive } }
        : {}),
      ...(search
        ? {
            OR: [
              { alt: { contains: search, mode: 'insensitive' } },
              { imageUrl: { contains: search, mode: 'insensitive' } },
              { product: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.productImage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { product: true },
        orderBy: [{ createdAt: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.productImage.count({ where }),
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
    const image = await this.prisma.productImage.findFirst({
      where: { id, product: { isActive: true } },
      include: { product: true },
    });

    if (!image) throw new NotFoundException('تصویر محصول پیدا نشد');
    return image;
  }

  async findOneAdmin(id: number) {
    const image = await this.prisma.productImage.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!image) throw new NotFoundException('تصویر محصول پیدا نشد');
    return image;
  }

  async update(id: number, dto: UpdateProductImageDto) {
    const current = await this.findOneAdmin(id);
    const targetProductId = dto.productId ?? current.productId;

    if (dto.productId !== undefined && dto.productId !== current.productId) {
      await this.assertActiveProduct(dto.productId);
    }

    return this.serializableTransaction(async (transaction) => {
      const nextIsPrimary = dto.isPrimary ?? current.isPrimary;

      if (nextIsPrimary) {
        await transaction.productImage.updateMany({
          where: {
            productId: targetProductId,
            isPrimary: true,
            NOT: { id },
          },
          data: { isPrimary: false },
        });
      }

      const updated = await transaction.productImage.update({
        where: { id },
        data: {
          ...(dto.imageUrl !== undefined
            ? { imageUrl: dto.imageUrl.trim() }
            : {}),
          ...(dto.productId !== undefined ? { productId: dto.productId } : {}),
          ...(dto.alt !== undefined
            ? { alt: this.cleanNullableText(dto.alt) }
            : {}),
          ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
        include: { product: true },
      });

      if (
        current.isPrimary &&
        (current.productId !== targetProductId || dto.isPrimary === false)
      ) {
        await this.promoteNextPrimary(
          transaction,
          current.productId,
          current.productId === targetProductId ? id : undefined,
        );
      }

      return updated;
    });
  }

  async remove(id: number) {
    const current = await this.findOneAdmin(id);

    await this.serializableTransaction(async (transaction) => {
      await transaction.productImage.delete({ where: { id } });

      if (current.isPrimary) {
        await this.promoteNextPrimary(transaction, current.productId);
      }
    });

    await this.safeDeleteLocalFile(current.imageUrl);

    return { message: 'تصویر محصول حذف شد', image: current };
  }

  async saveUpload(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('فایل تصویر ارسال نشده است');
    }

    const extension = IMAGE_EXTENSION_BY_MIME[file.mimetype];
    if (!extension || !this.matchesMagicBytes(file.buffer, file.mimetype)) {
      throw new BadRequestException('محتوای فایل با فرمت تصویر مطابقت ندارد');
    }

    const uploadDirectory = resolve(process.cwd(), 'uploads', 'products');
    await mkdir(uploadDirectory, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const target = join(uploadDirectory, filename);
    await writeFile(target, file.buffer, { flag: 'wx' });

    return {
      success: true,
      filename,
      imageUrl: `/uploads/products/${filename}`,
    };
  }

  private async assertActiveProduct(productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });

    if (!product) throw new NotFoundException('محصول فعال پیدا نشد');
  }

  private async promoteNextPrimary(
    transaction: Prisma.TransactionClient,
    productId: number,
    excludedId?: number,
  ) {
    const next = await transaction.productImage.findFirst({
      where: {
        productId,
        ...(excludedId ? { NOT: { id: excludedId } } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    if (next) {
      await transaction.productImage.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  private async serializableTransaction<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
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

    throw new BadRequestException('عملیات تصویر انجام نشد');
  }

  private matchesMagicBytes(buffer: Buffer, mimeType: string) {
    if (mimeType === 'image/jpeg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }

    if (mimeType === 'image/png') {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      return buffer.length >= 8 && buffer.subarray(0, 8).equals(png);
    }

    if (mimeType === 'image/webp') {
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }

    if (mimeType === 'image/avif') {
      if (
        buffer.length < 12 ||
        buffer.subarray(4, 8).toString('ascii') !== 'ftyp'
      ) {
        return false;
      }
      const brand = buffer.subarray(8, 12).toString('ascii');
      return (
        brand === 'avif' ||
        brand === 'avis' ||
        buffer.subarray(8, 32).includes(Buffer.from('avif'))
      );
    }

    return false;
  }

  private cleanNullableText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private async safeDeleteLocalFile(imageUrl: string) {
    const prefix = '/uploads/products/';
    if (!imageUrl.startsWith(prefix)) return;

    const filename = basename(imageUrl.slice(prefix.length));
    if (!filename) return;

    const uploadDirectory = resolve(process.cwd(), 'uploads', 'products');
    const target = resolve(uploadDirectory, filename);
    if (!target.startsWith(`${uploadDirectory}${sep}`)) return;

    await unlink(target).catch(() => undefined);
  }
}
