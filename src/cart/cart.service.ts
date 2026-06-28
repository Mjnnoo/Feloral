import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
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

    let total = 0;

    cart.items.forEach((item) => {
      const variant = item.variant;

      const price =
        variant.salePrice !== null && variant.salePrice !== undefined
          ? Number(variant.salePrice)
          : Number(variant.price);

      total += price * item.quantity;
    });

    return {
      id: cart.id,
      userId: cart.userId,
      items: cart.items,
      total,
      itemCount: cart.items.length,
    };
  }

  async addToCart(userId: number, variantId: number, quantity = 1) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new Error('Variant not found');
    }

    if (variant.stock < quantity) {
      throw new Error('Not enough stock');
    }

    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        variantId,
      },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId,
        quantity,
      },
    });
  }

  async removeItem(userId: number, itemId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) return;

    return this.prisma.cartItem.deleteMany({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });
  }

  async updateQuantity(itemId: number, quantity: number) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) return;

    return this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }
}