import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertEstimatedDays, calculateShippingCost } from './shipping.utils';

describe('shipping utilities', () => {
  it('applies free shipping threshold', () => {
    const cost = calculateShippingCost(
      new Prisma.Decimal(1000),
      new Prisma.Decimal(80),
      new Prisma.Decimal(900),
    );
    expect(cost.toNumber()).toBe(0);
  });

  it('uses flat rate below threshold', () => {
    const cost = calculateShippingCost(
      new Prisma.Decimal(500),
      new Prisma.Decimal(80),
      new Prisma.Decimal(900),
    );
    expect(cost.toNumber()).toBe(80);
  });

  it('rejects invalid delivery day range', () => {
    expect(() => assertEstimatedDays(5, 2)).toThrow(BadRequestException);
  });
});
