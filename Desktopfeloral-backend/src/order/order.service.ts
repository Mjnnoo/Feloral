import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';

import { CouponsService } from '../coupons/coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import {
  DEFAULT_RESERVATION_MINUTES,
  addMinutes,
  calculateLineTotal,
  effectivePrice,
  normalizeCheckoutKey,
  stockReference,
} from './order.utils';
import {
  assertAdminOrderTransition,
  buildInvoiceNumber,
} from './order-workflow.utils';

interface FinalizePaymentInput {
  authority: string;
  refId?: string;
  cardPan?: string;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly couponsService: CouponsService,
    private readonly shippingService: ShippingService,
  ) {}

  async createOrder(
    userId: number,
    dto: CreateOrderDto = {},
    headerCheckoutKey?: string,
  ) {
    await this.releaseExpiredReservations(25);

    const selectedShippingCount = [
      dto.shippingMethodId,
      dto.postexQuoteId,
    ].filter(Boolean).length;

    if (selectedShippingCount > 1) {
      throw new BadRequestException(
        'فقط یکی از روش ارسال ثابت یا استعلام Postex قابل انتخاب است',
      );
    }

    if (Boolean(dto.addressId) !== (selectedShippingCount === 1)) {
      throw new BadRequestException(
        'آدرس و روش ارسال باید هم‌زمان انتخاب شوند',
      );
    }

    const checkoutKey = normalizeCheckoutKey(
      userId,
      headerCheckoutKey || dto.checkoutKey,
    );

    if (checkoutKey) {
      const existing = await this.findOrderByCheckoutKey(userId, checkoutKey);
      if (existing) return existing;
    }

    try {
      return await this.prisma.$transaction(async (typedTx) => {
        const tx = typedTx as any;

        if (checkoutKey) {
          const existing = await tx.order.findFirst({
            where: { userId, checkoutKey },
            include: this.orderInclude(),
          });
          if (existing) return existing;
        }

        await tx.$queryRaw`
          SELECT "id"
          FROM "Cart"
          WHERE "userId" = ${userId}
          FOR UPDATE
        `;

        const cart = await tx.cart.findUnique({
          where: { userId },
          include: {
            items: {
              orderBy: { id: 'asc' },
              include: {
                variant: {
                  include: { product: true },
                },
              },
            },
          },
        });

        if (!cart || cart.items.length === 0) {
          throw new BadRequestException('سبد خرید خالی است');
        }

        let subtotal = new Prisma.Decimal(0);
        for (const item of cart.items) {
          if (!item.variant.isActive || !item.variant.product.isActive) {
            throw new BadRequestException(
              `${item.variant.product.name} در حال حاضر قابل خرید نیست`,
            );
          }
          if (item.quantity < 1 || item.quantity > item.variant.stock) {
            throw new BadRequestException(
              `موجودی ${item.variant.product.name} کافی نیست`,
            );
          }
          subtotal = subtotal.plus(
            calculateLineTotal(effectivePrice(item.variant), item.quantity),
          );
        }

        const shipping: any = dto.addressId
          ? dto.postexQuoteId
            ? await this.shippingService.resolvePostexForCheckout(
                tx,
                userId,
                dto.addressId,
                dto.postexQuoteId,
                subtotal,
                cart.items,
              )
            : dto.shippingMethodId
              ? await this.shippingService.resolveForCheckout(
                  tx,
                  userId,
                  dto.addressId,
                  dto.shippingMethodId,
                  subtotal,
                )
              : null
          : null;

        const couponResult = dto.couponCode
          ? await this.couponsService.evaluateForCheckout(
              tx,
              userId,
              dto.couponCode,
              subtotal,
            )
          : null;

        const shippingCost = shipping?.shippingCost ?? new Prisma.Decimal(0);
        const discountTotal = couponResult?.discount ?? new Prisma.Decimal(0);
        const payableTotal = subtotal
          .plus(discountTotal.mul(-1))
          .plus(shippingCost);

        if (!payableTotal.greaterThan(0)) {
          throw new BadRequestException(
            'مبلغ نهایی سفارش باید بزرگ‌تر از صفر باشد',
          );
        }

        const reservationExpiresAt = addMinutes(
          new Date(),
          this.getReservationMinutes(),
        );

        const address = shipping?.address;
        const method = shipping?.method;
        const postexQuote = shipping?.postexQuote;

        const order = await tx.order.create({
          data: {
            userId,
            addressId: address?.id,
            shippingMethodId: method?.id,
            postexQuoteId: postexQuote?.id,
            checkoutKey,
            status: OrderStatus.pending,
            subtotal,
            total: payableTotal,
            payableTotal,
            discountTotal,
            shippingCost,
            couponId: couponResult?.coupon.id,
            couponCode: couponResult?.code,
            reservationExpiresAt,
            shippingReceiverName: address?.receiverName,
            shippingReceiverMobile: address?.receiverMobile,
            shippingProvince: address?.province,
            shippingCity: address?.city,
            shippingAddressLine: address?.addressLine,
            shippingPostalCode: address?.postalCode,
            shippingPlaque: address?.plaque,
            shippingUnit: address?.unit,
            postexCityId: address?.postexCityId,
            postexBoxTypeId: postexQuote?.boxTypeId,
            postexPackageTitle: postexQuote?.packageTitle,
            postexPackageCode: postexQuote?.packageCode,
            postexCourierCode: postexQuote?.courierCode,
            postexServiceType: postexQuote?.serviceType,
            postexServiceName: postexQuote?.serviceName,
            postexEstimatedDelivery: postexQuote?.estimatedDelivery,
            postexInternalExtraCost: postexQuote?.internalExtraCost || 0,
            postexQuoteSnapshot: postexQuote?.responseSnapshot,
            shippingProvider: postexQuote ? 'postex' : method?.provider,
            shippingStatus: 'not_shipped',
            items: {
              create: cart.items.map((item) => {
                const unitPrice = effectivePrice(item.variant);
                return {
                  productId: item.variant.productId,
                  variantId: item.variantId,
                  productName: item.variant.product.name,
                  variantTitle: item.variant.title,
                  sku: item.variant.sku,
                  price: unitPrice,
                  quantity: item.quantity,
                  total: calculateLineTotal(unitPrice, item.quantity),
                };
              }),
            },
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            actorUserId: userId,
            fromStatus: null,
            toStatus: OrderStatus.pending,
            note: 'سفارش ایجاد شد و موجودی رزرو شد',
          },
        });

        if (couponResult) {
          await this.couponsService.reserveUsage(
            tx,
            couponResult.coupon.id,
            userId,
            order.id,
            discountTotal,
          );
        }

        if (postexQuote) {
          await this.shippingService.markPostexQuoteConsumed(
            tx,
            postexQuote.id,
          );
        }

        for (const item of cart.items) {
          const result = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              isActive: true,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });

          if (result.count !== 1) {
            throw new ConflictException(
              `موجودی تنوع ${item.variantId} هم‌زمان تغییر کرده است`,
            );
          }

          const updatedVariant = await tx.productVariant.findUniqueOrThrow({
            where: { id: item.variantId },
            select: { stock: true },
          });

          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              actorUserId: userId,
              delta: -item.quantity,
              balanceBefore: updatedVariant.stock + item.quantity,
              balanceAfter: updatedVariant.stock,
              reason: 'order_stock_reserved',
              reference: stockReference(order.id, 'reserve', item.variantId),
            },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: this.orderInclude(),
        });
      });
    } catch (error) {
      if (
        checkoutKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findOrderByCheckoutKey(userId, checkoutKey);
        if (existing) return existing;
      }
      throw error;
    }
  }

  getOrders(userId: number) {
    return (this.prisma as any).order.findMany({
      where: { userId },
      include: this.orderInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminList(query: AdminOrderQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;
    if (query.search) {
      const numericId = Number(query.search);
      where.OR = [
        ...(Number.isInteger(numericId) && numericId > 0
          ? [{ id: numericId }]
          : []),
        { couponCode: { contains: query.search, mode: 'insensitive' } },
        { user: { mobile: { contains: query.search } } },
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const db = this.prisma as any;
    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          ...this.orderInclude(),
          user: { select: { id: true, fullName: true, mobile: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }

  async getOrderById(id: number, userId: number) {
    const order = await (this.prisma as any).order.findFirst({
      where: { id, userId },
      include: this.orderInclude(),
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    return order;
  }

  async getAdminOrderById(id: number) {
    const order = await (this.prisma as any).order.findUnique({
      where: { id },
      include: {
        ...this.orderInclude(),
        user: {
          select: { id: true, fullName: true, mobile: true, email: true },
        },
      },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    return order;
  }

  async getPayableOrder(id: number, userId: number) {
    await this.releaseExpiredReservations(25);
    const order = await (this.prisma as any).order.findFirst({
      where: { id, userId },
      include: {
        items: true,
        paymentAttempts: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    if (order.status === OrderStatus.paid) {
      throw new BadRequestException('این سفارش قبلاً پرداخت شده است');
    }
    if (
      order.status !== OrderStatus.pending ||
      order.stockReleasedAt ||
      (order.reservationExpiresAt && order.reservationExpiresAt <= new Date())
    ) {
      throw new BadRequestException(
        'مهلت نگهداری موجودی این سفارش تمام شده است؛ سفارش جدید بسازید',
      );
    }
    return order;
  }

  async cancelOrder(id: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('فقط سفارش در انتظار پرداخت قابل لغو است');
    }
    return this.releaseOrderReservation(id, OrderStatus.canceled, userId);
  }

  async updateAdminStatus(
    id: number,
    actorUserId: number,
    dto: UpdateOrderStatusDto,
  ) {
    if (
      dto.status === OrderStatus.paid ||
      dto.status === OrderStatus.refunded
    ) {
      throw new BadRequestException(
        'وضعیت پرداخت و بازپرداخت فقط از گردش مالی تغییر می‌کند',
      );
    }

    const current = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!current) throw new NotFoundException('سفارش پیدا نشد');

    assertAdminOrderTransition(current.status, dto.status);
    if (current.status === dto.status) return this.getAdminOrderById(id);

    if (
      current.status === OrderStatus.pending &&
      (dto.status === OrderStatus.canceled || dto.status === OrderStatus.failed)
    ) {
      return this.releaseOrderReservation(
        id,
        dto.status === OrderStatus.canceled ? 'canceled' : 'failed',
        actorUserId,
        dto.note,
      );
    }

    return this.prisma.$transaction(async (typedTx) => {
      const tx = typedTx as any;
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('سفارش پیدا نشد');
      assertAdminOrderTransition(order.status, dto.status);

      if (dto.status === OrderStatus.shipped && !order.trackingCode) {
        throw new BadRequestException('قبل از ارسال باید کد رهگیری ثبت شود');
      }

      const data: any = { status: dto.status };
      if (dto.status === OrderStatus.processing)
        data.shippingStatus = 'preparing';
      if (dto.status === OrderStatus.shipped) {
        data.shippingStatus = 'shipped';
        data.shippedAt = new Date();
      }
      if (dto.status === OrderStatus.delivered) {
        data.shippingStatus = 'delivered';
        data.deliveredAt = new Date();
      }

      await tx.order.update({ where: { id }, data });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          actorUserId,
          fromStatus: order.status,
          toStatus: dto.status,
          note: dto.note,
        },
      });

      return tx.order.findUnique({
        where: { id },
        include: this.orderInclude(),
      });
    });
  }

  async updateShipment(
    id: number,
    actorUserId: number,
    dto: UpdateShipmentDto,
  ) {
    return this.prisma.$transaction(async (typedTx) => {
      const tx = typedTx as any;
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('سفارش پیدا نشد');
      if (order.status !== OrderStatus.processing) {
        throw new BadRequestException('فقط سفارش در حال پردازش قابل ارسال است');
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.shipped,
          shippingStatus: 'shipped',
          shippingProvider: dto.provider ?? order.shippingProvider,
          trackingCode: dto.trackingCode.trim(),
          trackingUrl: dto.trackingUrl?.trim(),
          providerOrderId: dto.providerOrderId?.trim(),
          shippingNote: dto.note?.trim(),
          shippedAt: new Date(),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          actorUserId,
          fromStatus: order.status,
          toStatus: OrderStatus.shipped,
          note: dto.note || `مرسوله با کد ${dto.trackingCode} ارسال شد`,
        },
      });

      return updated;
    });
  }

  async releaseExpiredReservations(limit = 50) {
    const candidates = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.pending,
        stockReleasedAt: null,
        reservationExpiresAt: { lte: new Date() },
      },
      select: { id: true },
      orderBy: { reservationExpiresAt: 'asc' },
      take: Math.max(1, Math.min(limit, 100)),
    });

    let releasedCount = 0;
    for (const candidate of candidates) {
      const result = await this.releaseOrderReservation(
        candidate.id,
        OrderStatus.failed,
      );
      if (result.released) releasedCount += 1;
    }
    return { releasedCount };
  }

  async finalizePaidOrder(orderId: number, input: FinalizePaymentInput) {
    return this.prisma.$transaction(async (typedTx) => {
      const tx = typedTx as any;
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, user: true },
      });
      if (!order) throw new NotFoundException('سفارش پیدا نشد');
      if (order.status === OrderStatus.paid) {
        await this.ensureInvoice(tx, order);
        return { order, alreadyPaid: true };
      }

      const mustReserveAgain =
        order.stockReleasedAt !== null || order.reservationExpiresAt === null;
      if (mustReserveAgain) {
        for (const item of order.items) {
          const result = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              isActive: true,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count !== 1)
            throw new ConflictException('ORDER_STOCK_REVIEW_REQUIRED');
          const updatedVariant = await tx.productVariant.findUniqueOrThrow({
            where: { id: item.variantId },
            select: { stock: true },
          });
          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              actorUserId: order.userId,
              delta: -item.quantity,
              balanceBefore: updatedVariant.stock + item.quantity,
              balanceAfter: updatedVariant.stock,
              reason: 'paid_order_stock_re_reserved',
              reference: stockReference(order.id, 're-reserve', item.variantId),
            },
          });
        }
      }

      const paidAt = new Date();
      const paidOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.paid,
          authority: input.authority,
          paymentRefId: input.refId,
          paymentCardPan: input.cardPan,
          paidAt,
          stockReleasedAt: null,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          actorUserId: order.userId,
          fromStatus: order.status,
          toStatus: OrderStatus.paid,
          note: 'پرداخت سفارش با موفقیت تأیید شد',
        },
      });

      await this.ensureInvoice(tx, { ...order, ...paidOrder, paidAt });

      const variantIds = order.items.map((item) => item.variantId);
      if (variantIds.length > 0) {
        const cart = await tx.cart.findUnique({
          where: { userId: order.userId },
          select: { id: true },
        });
        if (cart) {
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id, variantId: { in: variantIds } },
          });
        }
      }

      return { order: paidOrder, alreadyPaid: false };
    });
  }

  private async releaseOrderReservation(
    orderId: number,
    nextStatus: 'canceled' | 'failed',
    actorUserId?: number,
    note?: string,
  ) {
    return this.prisma.$transaction(async (typedTx) => {
      const tx = typedTx as any;
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('سفارش پیدا نشد');
      if (order.status !== OrderStatus.pending || order.stockReleasedAt) {
        return { released: false, order };
      }

      for (const item of order.items) {
        const updatedVariant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
          select: { stock: true },
        });
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            actorUserId: actorUserId ?? order.userId,
            delta: item.quantity,
            balanceBefore: updatedVariant.stock - item.quantity,
            balanceAfter: updatedVariant.stock,
            reason:
              nextStatus === OrderStatus.canceled
                ? 'order_canceled_stock_released'
                : 'order_expired_stock_released',
            reference: stockReference(order.id, 'release', item.variantId),
          },
        });
      }

      await this.couponsService.releaseUsage(tx, order.id);

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          stockReleasedAt: new Date(),
          canceledAt:
            nextStatus === OrderStatus.canceled ? new Date() : undefined,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          actorUserId: actorUserId ?? order.userId,
          fromStatus: order.status,
          toStatus: nextStatus,
          note:
            note ||
            (nextStatus === OrderStatus.canceled
              ? 'سفارش لغو و موجودی آزاد شد'
              : 'مهلت پرداخت تمام و موجودی آزاد شد'),
        },
      });

      return { released: true, order: updatedOrder };
    });
  }

  private findOrderByCheckoutKey(userId: number, checkoutKey: string) {
    return (this.prisma as any).order.findFirst({
      where: { userId, checkoutKey },
      include: this.orderInclude(),
    });
  }

  private getReservationMinutes() {
    const configured = Number(
      this.configService.get<string | number>('ORDER_RESERVATION_MINUTES'),
    );
    if (Number.isInteger(configured) && configured >= 5 && configured <= 180)
      return configured;
    return DEFAULT_RESERVATION_MINUTES;
  }

  private async ensureInvoice(tx: any, order: any) {
    const existing = await tx.invoice.findUnique({
      where: { orderId: order.id },
    });
    if (existing) return existing;

    const customerAddress = [
      order.shippingProvince,
      order.shippingCity,
      order.shippingAddressLine,
      order.shippingPlaque ? `پلاک ${order.shippingPlaque}` : null,
      order.shippingUnit ? `واحد ${order.shippingUnit}` : null,
    ]
      .filter(Boolean)
      .join('، ');

    return tx.invoice.create({
      data: {
        invoiceNumber: buildInvoiceNumber(order.id, order.paidAt || new Date()),
        orderId: order.id,
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        shippingCost: order.shippingCost,
        payableTotal: order.payableTotal,
        refundedTotal: order.refundedTotal || 0,
        customerName: order.shippingReceiverName || order.user?.fullName,
        customerMobile: order.shippingReceiverMobile || order.user?.mobile,
        customerAddress: customerAddress || null,
        issuedAt: order.paidAt || new Date(),
      },
    });
  }

  private orderInclude() {
    return {
      items: { include: { variant: true } },
      address: true,
      shippingMethod: true,
      postexQuote: { include: { origin: true } },
      postexEvents: { orderBy: { createdAt: 'desc' as const }, take: 20 },
      coupon: true,
      invoice: true,
      statusHistory: { orderBy: { createdAt: 'asc' as const } },
      paymentAttempts: { orderBy: { createdAt: 'desc' as const }, take: 5 },
    };
  }
}
