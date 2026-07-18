import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  addMinutes,
  calculateLineTotal,
  effectivePrice,
  normalizeCheckoutKey,
  stockReference,
  toSafeGatewayAmount,
} from './order.utils';

describe('checkout helpers', () => {
  it('namespaces idempotency keys by user', () => {
    expect(normalizeCheckoutKey(7, ' checkout-123 ')).toBe('7:checkout-123');
    expect(normalizeCheckoutKey(7, '   ')).toBeUndefined();
  });

  it('uses sale price when available', () => {
    expect(
      effectivePrice({
        price: new Prisma.Decimal(100),
        salePrice: 80,
      }).toNumber(),
    ).toBe(80);
    expect(
      effectivePrice({
        price: new Prisma.Decimal(100),
        salePrice: null,
      }).toNumber(),
    ).toBe(100);
  });

  it('calculates line totals with decimal arithmetic', () => {
    expect(calculateLineTotal(new Prisma.Decimal('12.5'), 4).toNumber()).toBe(
      50,
    );
  });

  it('creates deterministic stock movement references', () => {
    expect(stockReference(15, 'reserve', 9)).toBe('order:15:reserve:9');
  });

  it('adds reservation minutes without mutating the original date', () => {
    const original = new Date('2026-07-18T10:00:00.000Z');
    const result = addMinutes(original, 30);

    expect(result.toISOString()).toBe('2026-07-18T10:30:00.000Z');
    expect(original.toISOString()).toBe('2026-07-18T10:00:00.000Z');
  });

  it('accepts only positive safe integer gateway amounts', () => {
    expect(toSafeGatewayAmount(new Prisma.Decimal(120000))).toBe(120000);
    expect(() => toSafeGatewayAmount(new Prisma.Decimal('12.5'))).toThrow(
      BadRequestException,
    );
    expect(() => toSafeGatewayAmount(new Prisma.Decimal(0))).toThrow(
      BadRequestException,
    );
  });
});
