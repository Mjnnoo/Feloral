import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function calculateShippingCost(
  subtotal: Prisma.Decimal,
  flatRate: Prisma.Decimal,
  freeAbove?: Prisma.Decimal | null,
) {
  if (subtotal.lessThan(0) || flatRate.lessThan(0)) {
    throw new BadRequestException('مبلغ ارسال معتبر نیست');
  }

  if (freeAbove && freeAbove.greaterThan(0) && !subtotal.lessThan(freeAbove)) {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(flatRate);
}

export function assertEstimatedDays(minDays?: number | null, maxDays?: number | null) {
  if (minDays != null && maxDays != null && minDays > maxDays) {
    throw new BadRequestException('حداقل زمان ارسال نمی‌تواند از حداکثر بیشتر باشد');
  }
}
