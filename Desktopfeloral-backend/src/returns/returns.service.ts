import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { buildRefundNumber, buildReturnNumber } from '../order/order-workflow.utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminReturnNoteDto,
  ReceiveReturnDto,
  RequestReturnRefundDto,
} from './dto/admin-return-action.dto';
import { AdminReturnQueryDto } from './dto/admin-return-query.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  listMine(userId: number) {
    return (this.prisma as any).returnRequest.findMany({
      where: { userId },
      include: this.include(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMine(id: number, userId: number) {
    const item = await (this.prisma as any).returnRequest.findFirst({
      where: { id, userId },
      include: this.include(),
    });
    if (!item) throw new NotFoundException('درخواست مرجوعی پیدا نشد');
    return item;
  }

  async create(userId: number, dto: CreateReturnRequestDto) {
    const uniqueIds = new Set(dto.items.map((item) => item.orderItemId));
    if (uniqueIds.size !== dto.items.length) {
      throw new BadRequestException('هر قلم سفارش فقط یک‌بار قابل انتخاب است');
    }

    return this.prisma.$transaction(async (typedTx) => {
      const tx = typedTx as any;
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${dto.orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: dto.orderId, userId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('سفارش پیدا نشد');
      if (order.status !== OrderStatus.delivered || !order.deliveredAt) {
        throw new BadRequestException('فقط سفارش تحویل‌شده قابل مرجوعی است');
      }

      const deadline = new Date(
        order.deliveredAt.getTime() + this.getReturnWindowDays() * 86_400_000,
      );
      if (deadline < new Date()) {
        throw new BadRequestException('مهلت ثبت درخواست مرجوعی تمام شده است');
      }

      const orderItems = new Map<number, any>(order.items.map((item: any) => [item.id, item]));
      const prior = await tx.returnItem.findMany({
        where: {
          orderItemId: { in: [...uniqueIds] },
          returnRequest: {
            orderId: order.id,
            status: { notIn: ['rejected', 'canceled'] },
          },
        },
        select: { orderItemId: true, quantity: true },
      });
      const alreadyRequested = new Map<number, number>();
      for (const item of prior) {
        alreadyRequested.set(
          item.orderItemId,
          (alreadyRequested.get(item.orderItemId) ?? 0) + item.quantity,
        );
      }

      for (const item of dto.items) {
        const original = orderItems.get(item.orderItemId);
        if (!original) throw new BadRequestException('قلم انتخاب‌شده متعلق به این سفارش نیست');
        const remaining = original.quantity - (alreadyRequested.get(item.orderItemId) ?? 0);
        if (item.quantity > remaining) {
          throw new BadRequestException(`تعداد مرجوعی ${original.productName} بیشتر از مقدار مجاز است`);
        }
      }

      const returnNumber = buildReturnNumber(randomUUID().slice(0, 8).toUpperCase());
      return tx.returnRequest.create({
        data: {
          returnNumber,
          orderId: order.id,
          userId,
          reason: dto.reason.trim(),
          customerNote: dto.customerNote?.trim(),
          items: {
            create: dto.items.map((item) => ({
              orderItemId: item.orderItemId,
              quantity: item.quantity,
              reason: item.reason?.trim(),
            })),
          },
        },
        include: this.include(),
      });
    });
  }

  async cancel(id: number, userId: number) {
    const result = await (this.prisma as any).returnRequest.updateMany({
      where: { id, userId, status: 'requested' },
      data: { status: 'canceled', canceledAt: new Date() },
    });
    if (result.count === 0) {
      throw new BadRequestException('فقط درخواست در انتظار بررسی قابل لغو است');
    }
    return { success: true };
  }

  async adminList(query: AdminReturnQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where = query.status ? { status: query.status } : {};
    const db = this.prisma as any;
    const [items, total] = await Promise.all([
      db.returnRequest.findMany({
        where,
        include: this.include(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.returnRequest.count({ where }),
    ]);
    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }

  approve(id: number, dto: AdminReturnNoteDto) {
    return this.changeSimpleStatus(id, 'requested', 'approved', {
      approvedAt: new Date(),
      adminNote: dto.note?.trim(),
    });
  }

  reject(id: number, dto: AdminReturnNoteDto) {
    return this.changeSimpleStatus(id, ['requested', 'approved'], 'rejected', {
      rejectedAt: new Date(),
      adminNote: dto.note?.trim(),
    });
  }

  async receive(id: number, actorUserId: number, dto: ReceiveReturnDto) {
    return this.prisma.$transaction(async (typedTx) => {
      const tx = typedTx as any;
      await tx.$queryRaw`SELECT "id" FROM "ReturnRequest" WHERE "id" = ${id} FOR UPDATE`;
      const request = await tx.returnRequest.findUnique({
        where: { id },
        include: { items: { include: { orderItem: true } } },
      });
      if (!request) throw new NotFoundException('درخواست مرجوعی پیدا نشد');
      if (request.status !== 'approved') {
        throw new BadRequestException('فقط مرجوعی تأییدشده قابل دریافت است');
      }

      let restockedAt: Date | undefined;
      if (dto.restock !== false && !request.restockedAt) {
        for (const item of request.items) {
          const updated = await tx.productVariant.update({
            where: { id: item.orderItem.variantId },
            data: { stock: { increment: item.quantity } },
            select: { stock: true },
          });
          await tx.stockMovement.create({
            data: {
              variantId: item.orderItem.variantId,
              actorUserId,
              delta: item.quantity,
              balanceBefore: updated.stock - item.quantity,
              balanceAfter: updated.stock,
              reason: 'return_received_restock',
              reference: `return:${request.id}:restock:${item.orderItem.variantId}`,
            },
          });
        }
        restockedAt = new Date();
      }

      return tx.returnRequest.update({
        where: { id },
        data: {
          status: 'received',
          receivedAt: new Date(),
          restockedAt,
          adminNote: dto.note?.trim(),
        },
        include: this.include(),
      });
    });
  }

  async requestRefund(
    id: number,
    actorUserId: number,
    dto: RequestReturnRefundDto,
  ) {
    return this.prisma.$transaction(async (typedTx) => {
      const tx = typedTx as any;
      await tx.$queryRaw`SELECT "id" FROM "ReturnRequest" WHERE "id" = ${id} FOR UPDATE`;
      const request = await tx.returnRequest.findUnique({
        where: { id },
        include: {
          refund: true,
          order: true,
          items: { include: { orderItem: true } },
        },
      });
      if (!request) throw new NotFoundException('درخواست مرجوعی پیدا نشد');
      if (request.status !== 'received') {
        throw new BadRequestException('مرجوعی باید ابتدا در انبار دریافت شود');
      }
      if (request.refund) throw new ConflictException('بازپرداخت این مرجوعی قبلاً ثبت شده است');

      const maxRefundable = new Prisma.Decimal(request.order.payableTotal).plus(
        new Prisma.Decimal(request.order.refundedTotal).mul(-1),
      );
      const grossItems = request.items.reduce(
        (sum, item) =>
          sum.plus(
            new Prisma.Decimal(item.orderItem.total)
              .mul(1 / item.orderItem.quantity)
              .mul(item.quantity),
          ),
        new Prisma.Decimal(0),
      );
      const suggestedBase = grossItems.greaterThan(maxRefundable) ? maxRefundable : grossItems;
      const suggested = new Prisma.Decimal(Math.round(suggestedBase.toNumber() * 100) / 100);
      const amount = dto.amount != null ? new Prisma.Decimal(dto.amount) : suggested;

      if (!amount.greaterThan(0) || amount.greaterThan(maxRefundable)) {
        throw new BadRequestException('مبلغ بازپرداخت خارج از محدوده مجاز است');
      }

      const refund = await tx.refund.create({
        data: {
          refundNumber: buildRefundNumber(randomUUID().slice(0, 8).toUpperCase()),
          orderId: request.orderId,
          returnRequestId: request.id,
          processedByUserId: actorUserId,
          amount,
          status: 'pending',
          reason: request.reason,
          adminNote: dto.note?.trim(),
        },
      });

      await tx.returnRequest.update({
        where: { id },
        data: {
          status: 'refund_pending',
          refundRequestedAt: new Date(),
          adminNote: dto.note?.trim(),
        },
      });

      return refund;
    });
  }

  private async changeSimpleStatus(
    id: number,
    expected: string | string[],
    next: string,
    data: Record<string, unknown>,
  ) {
    const statuses = Array.isArray(expected) ? expected : [expected];
    const db = this.prisma as any;
    const result = await db.returnRequest.updateMany({
      where: { id, status: { in: statuses } },
      data: { ...data, status: next },
    });
    if (result.count === 0) {
      throw new BadRequestException('تغییر وضعیت این درخواست مجاز نیست');
    }
    return db.returnRequest.findUnique({ where: { id }, include: this.include() });
  }

  private getReturnWindowDays() {
    const configured = Number(this.configService.get('RETURN_WINDOW_DAYS'));
    if (Number.isInteger(configured) && configured >= 1 && configured <= 30) return configured;
    return 7;
  }

  private include() {
    return {
      order: { include: { user: { select: { id: true, fullName: true, mobile: true } } } },
      user: { select: { id: true, fullName: true, mobile: true } },
      items: { include: { orderItem: true } },
      refund: true,
    };
  }
}
