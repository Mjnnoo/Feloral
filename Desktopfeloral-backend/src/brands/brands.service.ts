import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PublicCatalogQueryDto } from '../catalog/dto/catalog-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryBrandsDto } from './dto/query-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    try {
      return await this.prisma.brand.create({
        data: {
          name: dto.name.trim(),
          slug: this.normalizeSlug(dto.slug),
          logo: this.cleanNullableText(dto.logo),
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

    return this.prisma.brand.findMany({
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

  async findAdmin(query: QueryBrandsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const where: Prisma.BrandWhereInput = {
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
      this.prisma.brand.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.brand.count({ where }),
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
    const brand = await this.prisma.brand.findFirst({
      where: { id, isActive: true },
    });

    if (!brand) throw new NotFoundException('برند پیدا نشد');
    return brand;
  }

  async findOneAdmin(id: number) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!brand) throw new NotFoundException('برند پیدا نشد');
    return brand;
  }

  async update(id: number, dto: UpdateBrandDto) {
    await this.findOneAdmin(id);

    try {
      return await this.prisma.brand.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.slug !== undefined
            ? { slug: this.normalizeSlug(dto.slug) }
            : {}),
          ...(dto.logo !== undefined
            ? { logo: this.cleanNullableText(dto.logo) }
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
    const brand = await this.findOneAdmin(id);

    if (!brand.isActive) {
      return { message: 'برند از قبل غیرفعال است', brand };
    }

    const updated = await this.prisma.brand.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'برند غیرفعال شد', brand: updated };
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
      throw new ConflictException('اسلاگ برند قبلاً استفاده شده است');
    }
  }
}
