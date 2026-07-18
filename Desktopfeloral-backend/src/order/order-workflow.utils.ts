import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

const ADMIN_TRANSITIONS: Partial<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.pending]: [OrderStatus.canceled, OrderStatus.failed],
  [OrderStatus.paid]: [OrderStatus.processing],
  [OrderStatus.processing]: [OrderStatus.shipped],
  [OrderStatus.shipped]: [OrderStatus.delivered],
};

export function assertAdminOrderTransition(
  current: OrderStatus,
  next: OrderStatus,
) {
  if (current === next) return;
  const allowed = ADMIN_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new BadRequestException(
      `تغییر وضعیت سفارش از ${current} به ${next} مجاز نیست`,
    );
  }
}

export function buildInvoiceNumber(orderId: number, issuedAt = new Date()) {
  return `FLR-${issuedAt.getUTCFullYear()}-${String(orderId).padStart(8, '0')}`;
}

export function buildReturnNumber(idSeed: string | number, at = new Date()) {
  return `RET-${at.getUTCFullYear()}-${String(idSeed)}`;
}

export function buildRefundNumber(idSeed: string | number, at = new Date()) {
  return `RFD-${at.getUTCFullYear()}-${String(idSeed)}`;
}
