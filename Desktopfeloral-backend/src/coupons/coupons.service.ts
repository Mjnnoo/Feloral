import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { calculateCouponDiscount, normalizeCouponCode } from './coupon.utils';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  adminList() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateCouponDto) {
    this.assertDefinition(dto);
    try {
      return await this.prisma.coupon.create({
        data: {
          ...dto,
          code: normalizeCouponCode(dto.code)!,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('کد تخفیف تکراری است');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateCouponDto) {
    const current = await this.prisma.coupon.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('کد تخفیف پیدا نشد');

    this.assertDefinition({ ...current, ...dto } as any);
    try {
      return await this.prisma.coupon.update({
        where: { id },
        data: {
          ...dto,
          code: dto.code ? normalizeCouponCode(dto.code) : undefined,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('کد تخفیف تکراری است');
      }
      throw error;
    }
  }

  async deactivate(id: number) {
    const result = await this.prisma.coupon.updateMany({
      where: { id, isActive: true },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('کد تخفیف فعال پیدا نشد');
    return { success: true };
  }

  async validateForUser(userId: number, code: string, subtotal?: Prisma.Decimal) {
    const amount = subtotal ?? (await this.getCartSubtotal(userId));
    return this.evaluateForCheckout(this.prisma as any, userId, code, amount);
  }

  async evaluateForCheckout(
    tx: any,
    userId: number,
    rawCode: string,
    subtotal: Prisma.Decimal,
  ) {
    const code = normalizeCouponCode(rawCode);
    if (!code) throw new BadRequestException('کد تخفیف وارد نشده است');

    await tx.$queryRaw`
      SELECT "id" FROM "Coupon" WHERE "code" = ${code} FOR UPDATE
    `;

    const coupon = await tx.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('کد تخفیف معتبر نیست');
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException('زمان استفاده از این کد هنوز شروع نشده است');
    }
    if (coupon.expiresAt && coupon.expiresAt <= now) {
      throw new BadRequestException('کد تخفیف منقضی شده است');
    }
    if (subtotal.lessThan(coupon.minOrderAmount)) {
      throw new BadRequestException('مبلغ سفارش برای استفاده از این کد کافی نیست');
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('ظرفیت استفاده از این کد تمام شده است');
    }

    if (coupon.usageLimitPerUser != null) {
      const usedByUser = await tx.couponUsage.count({
        where: { couponId: coupon.id, userId, releasedAt: null },
      });
      if (usedByUser >= coupon.usageLimitPerUser) {
        throw new BadRequestException('سقف استفاده شما از این کد پر شده است');
      }
    }

    const discount = calculateCouponDiscount(
      coupon.type,
      coupon.value,
      subtotal,
      coupon.maxDiscount,
    );

    return { coupon, code, discount };
  }

  async reserveUsage(
    tx: any,
    couponId: number,
    userId: number,
    orderId: number,
    discountAmount: Prisma.Decimal,
  ) {
    await tx.couponUsage.create({
      data: { couponId, userId, orderId, discountAmount },
    });
    await tx.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }

  async releaseUsage(tx: any, orderId: number) {
    const usage = await tx.couponUsage.findFirst({
      where: { orderId, releasedAt: null },
    });
    if (!usage) return false;

    await tx.couponUsage.update({
      where: { id: usage.id },
      data: { releasedAt: new Date() },
    });
    await tx.coupon.updateMany({
      where: { id: usage.couponId, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
    return true;
  }

  private async getCartSubtotal(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { variant: true } } },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('سبد خرید خالی است');
    }

    return cart.items.reduce(
      (sum, item) =>
        sum.plus(new Prisma.Decimal(item.variant.salePrice ?? item.variant.price).mul(item.quantity)),
      new Prisma.Decimal(0),
    );
  }

  private assertDefinition(dto: Partial<CreateCouponDto> & { type: any; value: any }) {
    const value = new Prisma.Decimal(dto.value ?? 0);
    if (!value.greaterThan(0)) throw new BadRequestException('مقدار تخفیف باید مثبت باشد');
    if (dto.type === 'percent' && value.greaterThan(100)) {
      throw new BadRequestException('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد');
    }
    if (dto.startsAt && dto.expiresAt && new Date(dto.startsAt) >= new Date(dto.expiresAt)) {
      throw new BadRequestException('تاریخ شروع باید قبل از تاریخ پایان باشد');
    }
  }
}
