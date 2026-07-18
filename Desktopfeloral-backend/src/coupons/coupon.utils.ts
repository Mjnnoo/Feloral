import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function normalizeCouponCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized || undefined;
}

export function calculateCouponDiscount(
  type: 'percent' | 'fixed',
  value: Prisma.Decimal,
  subtotal: Prisma.Decimal,
  maxDiscount?: Prisma.Decimal | null,
) {
  if (!subtotal.greaterThan(0) || !value.greaterThan(0)) {
    throw new BadRequestException('مقدار کوپن معتبر نیست');
  }

  if (type === 'percent' && value.greaterThan(100)) {
    throw new BadRequestException('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد');
  }

  let discount =
    type === 'percent' ? subtotal.mul(value.toNumber() / 100) : new Prisma.Decimal(value);

  if (maxDiscount && !maxDiscount.lessThan(0)) {
    discount = discount.greaterThan(maxDiscount) ? new Prisma.Decimal(maxDiscount) : discount;
  }

  const capped = discount.greaterThan(subtotal) ? new Prisma.Decimal(subtotal) : discount;
  return new Prisma.Decimal(Math.round(capped.toNumber() * 100) / 100);
}
