import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { calculateCouponDiscount, normalizeCouponCode } from './coupon.utils';

describe('coupon utilities', () => {
  it('normalizes coupon codes', () => {
    expect(normalizeCouponCode('  welcome_10 ')).toBe('WELCOME_10');
  });

  it('calculates percentage discount with a cap', () => {
    const result = calculateCouponDiscount(
      'percent',
      new Prisma.Decimal(20),
      new Prisma.Decimal(1000),
      new Prisma.Decimal(150),
    );
    expect(result.toNumber()).toBe(150);
  });

  it('rejects percentage values above 100', () => {
    expect(() =>
      calculateCouponDiscount(
        'percent',
        new Prisma.Decimal(101),
        new Prisma.Decimal(1000),
      ),
    ).toThrow(BadRequestException);
  });
});
