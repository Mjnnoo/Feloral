import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  DEFAULT_RESERVATION_MINUTES,
  addMinutes,
  calculateLineTotal,
  effectivePrice,
  normalizeCheckoutKey,
  stockReference,
} from './order.utils';

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
  ) {}

  async createOrder(
    userId: number,
    dto: CreateOrderDto = {},
    headerCheckoutKey?: string,
  ) {
    await this.releaseExpiredReservations(25);

    const checkoutKey = normalizeCheckoutKey(
      userId,
      headerCheckoutKey || dto.checkoutKey,
    );

    if (checkoutKey) {
      const existing = await this.findOrderByCheckoutKey(userId, checkoutKey);
      if (existing) return existing;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
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

        const address = dto.addressId
          ? await tx.address.findFirst({
              where: {
                id: dto.addressId,
                userId,
                isActive: true,
              },
            })
          : null;

        if (dto.addressId && !address) {
          throw new NotFoundException('آدرس فعال پیدا نشد');
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

        const reservationExpiresAt = addMinutes(
          new Date(),
          this.getReservationMinutes(),
        );

        const order = await tx.order.create({
          data: {
            userId,
            addressId: address?.id,
            checkoutKey,
            status: OrderStatus.pending,
            subtotal,
            total: subtotal,
            payableTotal: subtotal,
            discountTotal: new Prisma.Decimal(0),
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

        for (const item of cart.items) {
          const result = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              isActive: true,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
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

        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

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
    return this.prisma.order.findMany({
      where: { userId },
      include: this.orderInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(id: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    return order;
  }

  async getPayableOrder(id: number, userId: number) {
    await this.releaseExpiredReservations(25);

    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: true,
        paymentAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

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

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('فقط سفارش در انتظار پرداخت قابل لغو است');
    }

    return this.releaseOrderReservation(id, OrderStatus.canceled, userId);
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
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "Order"
        WHERE "id" = ${orderId}
        FOR UPDATE
      `;

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException('سفارش پیدا نشد');
      }

      if (order.status === OrderStatus.paid) {
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

          if (result.count !== 1) {
            throw new ConflictException('ORDER_STOCK_REVIEW_REQUIRED');
          }

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

      const paidOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.paid,
          authority: input.authority,
          paymentRefId: input.refId,
          paymentCardPan: input.cardPan,
          paidAt: new Date(),
          stockReleasedAt: null,
        },
      });

      const variantIds = order.items.map((item) => item.variantId);
      if (variantIds.length > 0) {
        const cart = await tx.cart.findUnique({
          where: { userId: order.userId },
          select: { id: true },
        });

        if (cart) {
          await tx.cartItem.deleteMany({
            where: {
              cartId: cart.id,
              variantId: { in: variantIds },
            },
          });
        }
      }

      return {
        order: paidOrder,
        alreadyPaid: false,
      };
    });
  }

  private async releaseOrderReservation(
    orderId: number,
    nextStatus: 'canceled' | 'failed',
    actorUserId?: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "Order"
        WHERE "id" = ${orderId}
        FOR UPDATE
      `;

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException('سفارش پیدا نشد');
      }

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

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          stockReleasedAt: new Date(),
          canceledAt:
            nextStatus === OrderStatus.canceled ? new Date() : undefined,
        },
        include: this.orderInclude(),
      });

      return { released: true, order: updatedOrder };
    });
  }

  private findOrderByCheckoutKey(userId: number, checkoutKey: string) {
    return this.prisma.order.findFirst({
      where: { userId, checkoutKey },
      include: this.orderInclude(),
    });
  }

  private getReservationMinutes() {
    const configured = Number(
      this.configService.get<string | number>('ORDER_RESERVATION_MINUTES'),
    );

    if (Number.isInteger(configured) && configured >= 5 && configured <= 180) {
      return configured;
    }

    return DEFAULT_RESERVATION_MINUTES;
  }

  private orderInclude() {
    return {
      items: {
        include: {
          variant: true,
        },
      },
      paymentAttempts: {
        orderBy: { createdAt: 'desc' as const },
        take: 5,
      },
    };
  }
}
