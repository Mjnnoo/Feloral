import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  // 🟢 ایجاد پرداخت
  async createPayment(orderId: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) throw new Error('Order not found');

    if (order.status !== 'pending') {
      throw new Error('Order already paid or invalid');
    }

    const res = await axios.post(
      'https://api.zarinpal.com/pg/v4/payment/request.json',
      {
        merchant_id: process.env.ZARINPAL_MERCHANT,
        amount: Number(order.total),
        callback_url: `http://localhost:3000/payment/verify?orderId=${order.id}`,
        description: `Order #${order.id}`,
      },
    );

    const authority = res.data.data.authority;

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        authority,
      },
    });

    return {
      url: `https://www.zarinpal.com/pg/StartPay/${authority}`,
    };
  }

  // 🟢 تایید پرداخت
  async verifyPayment(authority: string, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        authority,
      },
      include: {
        items: true,
      },
    });

    if (!order) throw new Error('Order not found');

    if (order.status === 'paid') {
      return { message: 'Already paid' };
    }

    const res = await axios.post(
      'https://api.zarinpal.com/pg/v4/payment/verify.json',
      {
        merchant_id: process.env.ZARINPAL_MERCHANT,
        authority,
        amount: Number(order.total),
      },
    );

    if (res.data.data.code === 100) {
      // 🟢 موفق
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'paid',
        },
      });

      // 🔥 کم کردن stock
      for (const item of order.items) {
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return {
        success: true,
      };
    }

    return {
      success: false,
    };
  }
}