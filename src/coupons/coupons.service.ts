import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { UpdateCouponActiveDto } from './dto/update-coupon-active.dto';

type CouponListQuery = {
  page?: string;
  limit?: string;
  search?: string;
  isActive?: string;
};

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private toNumber(
    value: unknown,
    fallback: number,
    min?: number,
    max?: number,
  ) {
    const number = Number(value);

    if (Number.isNaN(number) || number <= 0) {
      return fallback;
    }

    if (min !== undefined && number < min) {
      return min;
    }

    if (max !== undefined && number > max) {
      return max;
    }

    return number;
  }

  private parseBoolean(value?: string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    throw new BadRequestException('مقدار isActive باید true یا false باشد');
  }

  private toMoney(value: unknown) {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }

  private formatCoupon(coupon: any) {
    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,

      type: coupon.type,
      value: this.toMoney(coupon.value),
      maxDiscount:
        coupon.maxDiscount !== null && coupon.maxDiscount !== undefined
          ? this.toMoney(coupon.maxDiscount)
          : null,
      minOrderAmount: this.toMoney(coupon.minOrderAmount),

      usageLimit: coupon.usageLimit,
      usageLimitPerUser: coupon.usageLimitPerUser,
      usedCount: coupon.usedCount,

      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      isActive: coupon.isActive,

      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }

  private validateCouponDates(startsAt?: string, expiresAt?: string) {
    if (!startsAt || !expiresAt) {
      return;
    }

    const start = new Date(startsAt);
    const end = new Date(expiresAt);

    if (start > end) {
      throw new BadRequestException(
        'تاریخ شروع کوپن نمی‌تواند بعد از تاریخ پایان باشد',
      );
    }
  }

  private validateCouponValue(type: CouponType, value: number) {
    if (value <= 0) {
      throw new BadRequestException('مقدار تخفیف باید بیشتر از صفر باشد');
    }

    if (type === CouponType.percent && value > 100) {
      throw new BadRequestException('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد');
    }
  }

  private calculateDiscount(coupon: any, subtotal: number) {
    let discountAmount = 0;

    if (coupon.type === CouponType.percent) {
      discountAmount = Math.floor((subtotal * Number(coupon.value)) / 100);

      if (
        coupon.maxDiscount !== null &&
        coupon.maxDiscount !== undefined &&
        discountAmount > Number(coupon.maxDiscount)
      ) {
        discountAmount = Number(coupon.maxDiscount);
      }
    }

    if (coupon.type === CouponType.fixed) {
      discountAmount = Number(coupon.value);
    }

    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    if (discountAmount < 0) {
      discountAmount = 0;
    }

    return discountAmount;
  }

  private async findCouponByCodeOrFail(code: string) {
    const normalizedCode = this.normalizeCode(code);

    const coupon = await this.prisma.coupon.findUnique({
      where: {
        code: normalizedCode,
      },
    });

    if (!coupon) {
      throw new NotFoundException('کد تخفیف پیدا نشد');
    }

    return coupon;
  }

  private async findCouponOrFail(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: {
        id,
      },
    });

    if (!coupon) {
      throw new NotFoundException('کد تخفیف پیدا نشد');
    }

    return coupon;
  }

  private async calculateUserCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('سبد خرید خالی است');
    }

    let subtotal = 0;
    let totalQuantity = 0;

    const items = cart.items.map((item) => {
      const variant = item.variant;

      if (!variant.isActive) {
        throw new BadRequestException(
          `تنوع محصول با SKU ${variant.sku} فعال نیست`,
        );
      }

      if (!variant.product?.isActive) {
        throw new BadRequestException(
          `محصول ${variant.product?.name ?? ''} فعال نیست`,
        );
      }

      if (item.quantity > variant.stock) {
        throw new BadRequestException(`موجودی محصول ${variant.sku} کافی نیست`);
      }

      const price = Number(variant.price);
      const salePrice =
        variant.salePrice !== null && variant.salePrice !== undefined
          ? Number(variant.salePrice)
          : null;

      const finalPrice =
        salePrice !== null && salePrice < price ? salePrice : price;

      const lineTotal = finalPrice * item.quantity;

      subtotal += lineTotal;
      totalQuantity += item.quantity;

      return {
        cartItemId: item.id,
        productId: item.productId ?? variant.productId,
        variantId: item.variantId,
        productName: variant.product?.name ?? null,
        variantTitle: variant.title,
        sku: variant.sku,
        quantity: item.quantity,
        price,
        salePrice,
        finalPrice,
        lineTotal,
      };
    });

    return {
      items,
      summary: {
        itemsCount: items.length,
        totalQuantity,
        subtotal,
      },
    };
  }

  async create(dto: CreateCouponDto) {
    const code = this.normalizeCode(dto.code);

    this.validateCouponValue(dto.type, dto.value);
    this.validateCouponDates(dto.startsAt, dto.expiresAt);

    const existing = await this.prisma.coupon.findUnique({
      where: {
        code,
      },
    });

    if (existing) {
      throw new ConflictException('این کد تخفیف قبلاً ثبت شده است');
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        code,
        title: dto.title ?? null,
        description: dto.description ?? null,

        type: dto.type,
        value: dto.value,

        maxDiscount: dto.maxDiscount ?? null,
        minOrderAmount: dto.minOrderAmount ?? 0,

        usageLimit: dto.usageLimit ?? null,
        usageLimitPerUser: dto.usageLimitPerUser ?? null,

        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,

        isActive: dto.isActive ?? true,
      },
    });

    return {
      message: 'کد تخفیف با موفقیت ساخته شد',
      coupon: this.formatCoupon(coupon),
    };
  }

  async findAll(query: CouponListQuery) {
    const page = this.toNumber(query.page, 1, 1, 100000);
    const limit = this.toNumber(query.limit, 20, 1, 100);
    const skip = (page - 1) * limit;

    const search = query.search?.trim();
    const isActive = this.parseBoolean(query.isActive);

    const where: Prisma.CouponWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        {
          code: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          title: {
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

    const [total, coupons] = await Promise.all([
      this.prisma.coupon.count({
        where,
      }),

      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: coupons.map((coupon) => this.formatCoupon(coupon)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: {
        id,
      },
      include: {
        usages: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                mobile: true,
                email: true,
              },
            },
            order: {
              select: {
                id: true,
                status: true,
                total: true,
                subtotal: true,
                discountTotal: true,
                payableTotal: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('کد تخفیف پیدا نشد');
    }

    return {
      coupon: this.formatCoupon(coupon),
      recentUsages: coupon.usages.map((usage) => ({
        id: usage.id,
        discountAmount: Number(usage.discountAmount),
        user: usage.user,
        order: {
          ...usage.order,
          total: Number(usage.order.total),
          subtotal: Number(usage.order.subtotal),
          discountTotal: Number(usage.order.discountTotal),
          payableTotal: Number(usage.order.payableTotal),
        },
        createdAt: usage.createdAt,
      })),
    };
  }

  async update(id: number, dto: UpdateCouponDto) {
    const current = await this.findCouponOrFail(id);

    const finalType = dto.type ?? current.type;
    const finalValue =
      dto.value !== undefined ? dto.value : Number(current.value);

    this.validateCouponValue(finalType, finalValue);
    this.validateCouponDates(
      dto.startsAt ?? current.startsAt?.toISOString(),
      dto.expiresAt ?? current.expiresAt?.toISOString(),
    );

    const data: Prisma.CouponUpdateInput = {};

    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);

      const duplicate = await this.prisma.coupon.findFirst({
        where: {
          code,
          id: {
            not: id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException('این کد تخفیف قبلاً ثبت شده است');
      }

      data.code = code;
    }

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.maxDiscount !== undefined) data.maxDiscount = dto.maxDiscount;
    if (dto.minOrderAmount !== undefined) data.minOrderAmount = dto.minOrderAmount;
    if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
    if (dto.usageLimitPerUser !== undefined) {
      data.usageLimitPerUser = dto.usageLimitPerUser;
    }
    if (dto.startsAt !== undefined) {
      data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }
    if (dto.expiresAt !== undefined) {
      data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const coupon = await this.prisma.coupon.update({
      where: {
        id,
      },
      data,
    });

    return {
      message: 'کد تخفیف با موفقیت ویرایش شد',
      coupon: this.formatCoupon(coupon),
    };
  }

  async updateActive(id: number, dto: UpdateCouponActiveDto) {
    await this.findCouponOrFail(id);

    const coupon = await this.prisma.coupon.update({
      where: {
        id,
      },
      data: {
        isActive: dto.isActive,
      },
    });

    return {
      message: dto.isActive
        ? 'کد تخفیف با موفقیت فعال شد'
        : 'کد تخفیف با موفقیت غیرفعال شد',
      coupon: this.formatCoupon(coupon),
    };
  }

  async remove(id: number) {
    await this.findCouponOrFail(id);

    await this.prisma.coupon.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });

    return {
      message: 'کد تخفیف با موفقیت غیرفعال شد',
    };
  }

  async validateForUserCart(userId: number, code: string) {
    const coupon = await this.findCouponByCodeOrFail(code);
    const cart = await this.calculateUserCart(userId);

    const now = new Date();
    const subtotal = cart.summary.subtotal;

    if (!coupon.isActive) {
      throw new BadRequestException('این کد تخفیف غیرفعال است');
    }

    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException(
        'زمان استفاده از این کد تخفیف هنوز شروع نشده است',
      );
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException('این کد تخفیف منقضی شده است');
    }

    if (
      coupon.usageLimit !== null &&
      coupon.usageLimit !== undefined &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      throw new BadRequestException('ظرفیت استفاده از این کد تخفیف تمام شده است');
    }

    if (subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `حداقل مبلغ سفارش برای این کد تخفیف ${Number(
          coupon.minOrderAmount,
        )} تومان است`,
      );
    }

    if (
      coupon.usageLimitPerUser !== null &&
      coupon.usageLimitPerUser !== undefined
    ) {
      const userUsageCount = await this.prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          userId,
        },
      });

      if (userUsageCount >= coupon.usageLimitPerUser) {
        throw new BadRequestException(
          'شما قبلاً از این کد تخفیف به تعداد مجاز استفاده کرده‌اید',
        );
      }
    }

    const discountAmount = this.calculateDiscount(coupon, subtotal);
    const payableTotal = subtotal - discountAmount;

    return {
      success: true,
      message: 'کد تخفیف معتبر است',

      coupon: this.formatCoupon(coupon),

      cart: {
        items: cart.items,
        summary: {
          ...cart.summary,
          discountAmount,
          payableTotal,
        },
      },
    };
  }

  async getMyUsages(userId: number) {
    const usages = await this.prisma.couponUsage.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        coupon: true,
        order: {
          select: {
            id: true,
            status: true,
            total: true,
            subtotal: true,
            discountTotal: true,
            payableTotal: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      data: usages.map((usage) => ({
        id: usage.id,
        discountAmount: Number(usage.discountAmount),
        coupon: this.formatCoupon(usage.coupon),
        order: {
          ...usage.order,
          total: Number(usage.order.total),
          subtotal: Number(usage.order.subtotal),
          discountTotal: Number(usage.order.discountTotal),
          payableTotal: Number(usage.order.payableTotal),
        },
        createdAt: usage.createdAt,
      })),
      meta: {
        total: usages.length,
      },
    };
  }
}