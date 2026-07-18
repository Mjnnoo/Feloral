import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MAX_CART_QUANTITY, effectivePrice } from '../order/order.utils';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });
    }

    let subtotal = new Prisma.Decimal(0);
    let quantityTotal = 0;

    const items = cart.items.map((item) => {
      const unitPrice = effectivePrice(item.variant);
      const lineTotal = unitPrice.mul(item.quantity);
      const isAvailable =
        item.variant.isActive &&
        item.variant.product.isActive &&
        item.variant.stock >= item.quantity;

      subtotal = subtotal.plus(lineTotal);
      quantityTotal += item.quantity;

      return {
        ...item,
        unitPrice,
        lineTotal,
        isAvailable,
        availabilityReason: !item.variant.product.isActive
          ? 'محصول غیرفعال است'
          : !item.variant.isActive
            ? 'تنوع محصول غیرفعال است'
            : item.variant.stock < item.quantity
              ? 'موجودی کافی نیست'
              : null,
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      total: subtotal.toNumber(),
      subtotal,
      itemCount: items.length,
      quantityTotal,
      hasUnavailableItems: items.some((item) => !item.isAvailable),
    };
  }

  async addToCart(userId: number, variantId: number, quantity = 1) {
    this.assertQuantity(quantity);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "ProductVariant"
        WHERE "id" = ${variantId}
        FOR UPDATE
      `;

      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });

      if (!variant) {
        throw new NotFoundException('تنوع محصول پیدا نشد');
      }

      if (!variant.isActive || !variant.product.isActive) {
        throw new BadRequestException('این محصول در حال حاضر قابل خرید نیست');
      }

      const cart = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId,
          },
        },
      });

      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      this.assertQuantity(nextQuantity);

      if (nextQuantity > variant.stock) {
        throw new BadRequestException('تعداد نهایی سبد از موجودی بیشتر است');
      }

      return tx.cartItem.upsert({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId,
          },
        },
        update: { quantity: nextQuantity },
        create: {
          cartId: cart.id,
          productId: variant.productId,
          variantId,
          quantity,
        },
      });
    });
  }

  async removeItem(userId: number, itemId: number) {
    const result = await this.prisma.cartItem.deleteMany({
      where: {
        id: itemId,
        cart: { userId },
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('آیتم سبد پیدا نشد');
    }

    return { success: true };
  }

  async updateQuantity(userId: number, itemId: number, quantity: number) {
    this.assertQuantity(quantity);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      include: {
        variant: {
          include: { product: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('آیتم سبد پیدا نشد');
    }

    if (!item.variant.isActive || !item.variant.product.isActive) {
      throw new BadRequestException('این محصول در حال حاضر قابل خرید نیست');
    }

    if (quantity > item.variant.stock) {
      throw new BadRequestException('موجودی کافی نیست');
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async clearCart(userId: number) {
    const result = await this.prisma.cartItem.deleteMany({
      where: { cart: { userId } },
    });

    return { success: true, deletedCount: result.count };
  }

  private assertQuantity(quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException(
        'تعداد باید یک عدد صحیح بزرگ‌تر از صفر باشد',
      );
    }

    if (quantity > MAX_CART_QUANTITY) {
      throw new BadRequestException(
        `تعداد هر کالا در سبد نمی‌تواند بیشتر از ${MAX_CART_QUANTITY} باشد`,
      );
    }
  }
}
