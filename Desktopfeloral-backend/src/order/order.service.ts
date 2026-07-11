import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // 🟢 ساخت سفارش از سبد خرید
  async createOrder(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    const total = cart.items.reduce((sum, item) => {
      const price =
        item.variant.salePrice !== null && item.variant.salePrice !== undefined
          ? Number(item.variant.salePrice)
          : Number(item.variant.price);

      return sum + price * item.quantity;
    }, 0);

    const order = await this.prisma.order.create({
      data: {
        userId,
        total,
        status: 'pending',
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.variant.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    return order;
  }

  // 🟢 گرفتن همه سفارش‌ها
  async getOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // 🟢 گرفتن یک سفارش
  async getOrderById(id: number, userId: number) {
    return this.prisma.order.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });
  }
}