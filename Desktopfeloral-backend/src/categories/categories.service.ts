import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PublicCatalogQueryDto } from '../catalog/dto/catalog-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          slug: this.normalizeSlug(dto.slug),
          description: this.cleanNullableText(dto.description),
          image: this.cleanNullableText(dto.image),
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error: unknown) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  findPublic(query: PublicCatalogQueryDto) {
    const search = query.search?.trim();

    return this.prisma.category.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: query.limit ?? 100,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async findAdmin(query: QueryCategoriesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const where: Prisma.CategoryWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.category.count({ where }),
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
    const category = await this.prisma.category.findFirst({
      where: { id, isActive: true },
    });

    if (!category) throw new NotFoundException('دسته‌بندی پیدا نشد');
    return category;
  }

  async findOneAdmin(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) throw new NotFoundException('دسته‌بندی پیدا نشد');
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOneAdmin(id);

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.slug !== undefined
            ? { slug: this.normalizeSlug(dto.slug) }
            : {}),
          ...(dto.description !== undefined
            ? { description: this.cleanNullableText(dto.description) }
            : {}),
          ...(dto.image !== undefined
            ? { image: this.cleanNullableText(dto.image) }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    } catch (error: unknown) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  async deactivate(id: number) {
    const category = await this.findOneAdmin(id);

    if (!category.isActive) {
      return { message: 'دسته‌بندی از قبل غیرفعال است', category };
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'دسته‌بندی غیرفعال شد', category: updated };
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
      throw new ConflictException('اسلاگ دسته‌بندی قبلاً استفاده شده است');
    }
  }
}
