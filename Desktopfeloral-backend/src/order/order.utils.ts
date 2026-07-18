import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const MAX_CART_QUANTITY = 99;
export const DEFAULT_RESERVATION_MINUTES = 30;

export function normalizeCheckoutKey(
  userId: number,
  value?: string,
): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  if (normalized.length < 8 || normalized.length > 120) {
    throw new BadRequestException(
      'کلید تکرارناپذیری باید بین 8 تا 120 کاراکتر باشد',
    );
  }

  return `${userId}:${normalized}`;
}

export function effectivePrice(value: {
  price: Prisma.Decimal | number | string;
  salePrice?: Prisma.Decimal | number | string | null;
}): Prisma.Decimal {
  return new Prisma.Decimal(value.salePrice ?? value.price);
}

export function calculateLineTotal(
  unitPrice: Prisma.Decimal,
  quantity: number,
): Prisma.Decimal {
  return unitPrice.mul(quantity);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function stockReference(
  orderId: number,
  action: 'reserve' | 'release' | 're-reserve',
  variantId: number,
): string {
  return `order:${orderId}:${action}:${variantId}`;
}

export function toSafeGatewayAmount(value: Prisma.Decimal): number {
  if (!value.greaterThan(0) || !value.isInteger()) {
    throw new BadRequestException(
      'مبلغ قابل پرداخت باید یک عدد صحیح و بزرگ‌تر از صفر باشد',
    );
  }

  const amount = value.toNumber();

  if (!Number.isSafeInteger(amount)) {
    throw new BadRequestException('مبلغ قابل پرداخت خارج از محدوده مجاز است');
  }

  return amount;
}
