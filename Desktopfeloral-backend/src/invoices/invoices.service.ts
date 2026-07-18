import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { buildInvoiceNumber } from '../order/order-workflow.utils';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceQueryDto } from './dto/invoice-query.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(orderId: number, userId: number) {
    const db = this.prisma as any;
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: { in: [OrderStatus.paid, OrderStatus.processing, OrderStatus.shipped, OrderStatus.delivered, OrderStatus.refunded] },
      },
      include: { invoice: true, user: true },
    });
    if (!order) throw new NotFoundException('فاکتور قابل مشاهده‌ای برای این سفارش وجود ندارد');
    return order.invoice || this.createForOrder(order);
  }

  async getAdmin(orderId: number) {
    const db = this.prisma as any;
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { invoice: true, user: true },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    if (!order.paidAt) throw new NotFoundException('برای سفارش پرداخت‌نشده فاکتور صادر نمی‌شود');
    return order.invoice || this.createForOrder(order);
  }

  async adminList(query: InvoiceQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const db = this.prisma as any;
    const [items, total] = await Promise.all([
      db.invoice.findMany({
        include: {
          order: { include: { user: { select: { id: true, fullName: true, mobile: true } } } },
        },
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count(),
    ]);
    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }

  private async createForOrder(order: any) {
    const customerAddress = [
      order.shippingProvince,
      order.shippingCity,
      order.shippingAddressLine,
      order.shippingPlaque ? `پلاک ${order.shippingPlaque}` : null,
      order.shippingUnit ? `واحد ${order.shippingUnit}` : null,
    ].filter(Boolean).join('، ');

    try {
      return await (this.prisma as any).invoice.create({
        data: {
          invoiceNumber: buildInvoiceNumber(order.id, order.paidAt || new Date()),
          orderId: order.id,
          subtotal: order.subtotal,
          discountTotal: order.discountTotal,
          shippingCost: order.shippingCost,
          payableTotal: order.payableTotal,
          refundedTotal: order.refundedTotal,
          status: Number(order.refundedTotal) >= Number(order.payableTotal) ? 'refunded' : 'issued',
          customerName: order.shippingReceiverName || order.user?.fullName,
          customerMobile: order.shippingReceiverMobile || order.user?.mobile,
          customerAddress: customerAddress || null,
          issuedAt: order.paidAt || new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return (this.prisma as any).invoice.findUnique({ where: { orderId: order.id } });
      }
      throw error;
    }
  }
}
