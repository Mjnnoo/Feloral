import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { assertAdminOrderTransition, buildInvoiceNumber } from './order-workflow.utils';

describe('order workflow utilities', () => {
  it('allows paid to processing', () => {
    expect(() =>
      assertAdminOrderTransition(OrderStatus.paid, OrderStatus.processing),
    ).not.toThrow();
  });

  it('rejects direct paid to delivered', () => {
    expect(() =>
      assertAdminOrderTransition(OrderStatus.paid, OrderStatus.delivered),
    ).toThrow(BadRequestException);
  });

  it('builds stable invoice numbers', () => {
    expect(buildInvoiceNumber(42, new Date('2026-07-18T00:00:00Z'))).toBe(
      'FLR-2026-00000042',
    );
  });
});
