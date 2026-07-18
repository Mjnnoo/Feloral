import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RefundQueryDto } from './dto/refund-query.dto';
import { UpdateRefundStatusDto } from './dto/update-refund-status.dto';

@Injectable()
export class RefundsService {
  constructor(private readonly prisma: PrismaService) {}

  async adminList(query: RefundQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where = query.status ? { status: query.status } : {};
    const db = this.prisma as any;
    const [items, total] = await Promise.all([
      db.refund.findMany({
        where,
        include: {
          order: { include: { user: { select: { id: true, fullName: true, mobile: true } } } },
          returnRequest: true,
          processedBy: { select: { id: true, fullName: true, mobile: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.refund.count({ where }),
    ]);
    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }

  async updateStatus(id: number, actorUserId: number, dto: UpdateRefundStatusDto) {
    return this.prisma.$transaction(async (typedTx) => {
      const tx = typedTx as any;
      await tx.$queryRaw`SELECT "id" FROM "Refund" WHERE "id" = ${id} FOR UPDATE`;
      const refund = await tx.refund.findUnique({
        where: { id },
        include: { order: true, returnRequest: true },
      });
      if (!refund) throw new NotFoundException('بازپرداخت پیدا نشد');

      const allowed: Record<string, string[]> = {
        pending: ['processing', 'succeeded', 'failed', 'canceled'],
        processing: ['succeeded', 'failed'],
        failed: ['processing'],
      };
      if (!(allowed[refund.status] ?? []).includes(dto.status)) {
        throw new BadRequestException('تغییر وضعیت بازپرداخت مجاز نیست');
      }

      if (dto.status !== 'succeeded') {
        return tx.refund.update({
          where: { id },
          data: {
            status: dto.status,
            processedByUserId: actorUserId,
            gatewayReference: dto.gatewayReference?.trim(),
            adminNote: dto.note?.trim(),
            processedAt: dto.status === 'processing' ? new Date() : refund.processedAt,
            failedAt: dto.status === 'failed' ? new Date() : undefined,
          },
        });
      }

      const amount = new Prisma.Decimal(refund.amount);
      const currentRefunded = new Prisma.Decimal(refund.order.refundedTotal);
      const payable = new Prisma.Decimal(refund.order.payableTotal);
      const nextRefunded = currentRefunded.plus(amount);
      if (nextRefunded.greaterThan(payable)) {
        throw new BadRequestException('مجموع بازپرداخت از مبلغ سفارش بیشتر می‌شود');
      }

      const succeededAt = new Date();
      await tx.refund.update({
        where: { id },
        data: {
          status: 'succeeded',
          processedByUserId: actorUserId,
          gatewayReference: dto.gatewayReference?.trim(),
          adminNote: dto.note?.trim(),
          processedAt: refund.processedAt || succeededAt,
          succeededAt,
        },
      });

      if (refund.returnRequestId) {
        await tx.returnRequest.update({
          where: { id: refund.returnRequestId },
          data: { status: 'refunded', refundedAt: succeededAt },
        });
      }

      const fullyRefunded = !nextRefunded.lessThan(payable);
      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          refundedTotal: nextRefunded,
          status: fullyRefunded ? OrderStatus.refunded : refund.order.status,
        },
      });

      await tx.invoice.updateMany({
        where: { orderId: refund.orderId },
        data: {
          refundedTotal: nextRefunded,
          status: fullyRefunded ? 'refunded' : 'issued',
        },
      });

      if (fullyRefunded && refund.order.status !== OrderStatus.refunded) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: refund.orderId,
            actorUserId,
            fromStatus: refund.order.status,
            toStatus: OrderStatus.refunded,
            note: dto.note || 'کل مبلغ سفارش بازپرداخت شد',
          },
        });
      }

      return tx.refund.findUnique({
        where: { id },
        include: { order: true, returnRequest: true },
      });
    });
  }
}
