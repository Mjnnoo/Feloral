import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import axios from 'axios';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getProvider() {
    return this.configService.get<string>('PAYMENT_PROVIDER') ?? 'mock';
  }

  private formatOrder(order: any) {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      total: Number(order.total),
      authority: order.authority,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async createPayment(orderId: number, userId: number) {
    if (!orderId || Number.isNaN(Number(orderId))) {
      throw new BadRequestException('شناسه سفارش نامعتبر است');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    if (order.status === OrderStatus.paid) {
      throw new BadRequestException('این سفارش قبلاً پرداخت شده است');
    }

    if (order.status !== OrderStatus.pending && order.status !== OrderStatus.failed) {
      throw new BadRequestException('این سفارش قابل پرداخت نیست');
    }

    if (Number(order.total) <= 0) {
      throw new BadRequestException('مبلغ سفارش نامعتبر است');
    }

    const provider = this.getProvider();

    if (provider === 'mock') {
      return this.createMockPayment(order.id, Number(order.total));
    }

    if (provider === 'zarinpal') {
      return this.createZarinpalPayment(order.id, Number(order.total));
    }

    throw new BadRequestException('درگاه پرداخت نامعتبر است');
  }

  async verifyPayment(authority: string, orderId: number, status?: string) {
    if (!authority) {
      throw new BadRequestException('Authority ارسال نشده است');
    }

    if (!orderId || Number.isNaN(Number(orderId))) {
      throw new BadRequestException('شناسه سفارش نامعتبر است');
    }

    const provider = this.getProvider();

    if (provider === 'mock') {
      return this.verifyMockPayment(authority, orderId, status);
    }

    if (provider === 'zarinpal') {
      return this.verifyZarinpalPayment(authority, orderId, status);
    }

    throw new BadRequestException('درگاه پرداخت نامعتبر است');
  }

  async getMyPayments(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        OR: [
          {
            authority: {
              not: null,
            },
          },
          {
            status: {
              in: [
                OrderStatus.paid,
                OrderStatus.failed,
                OrderStatus.refunded,
              ],
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: orders.map((order) => ({
        orderId: order.id,
        provider: this.getProvider(),
        authority: order.authority,
        status: order.status,
        amount: Number(order.total),
        paid: order.status === OrderStatus.paid,
        failed: order.status === OrderStatus.failed,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      meta: {
        total: orders.length,
      },
    };
  }

  private async createMockPayment(orderId: number, amount: number) {
    const authority = `MOCK-${orderId}-${Date.now()}`;

    const order = await this.prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        authority,
        status: OrderStatus.pending,
      },
    });

    return {
      success: true,
      provider: 'mock',
      orderId,
      authority,
      amount,
      order: this.formatOrder(order),
      url: `http://localhost:3000/payment/mock-pay?Authority=${authority}&orderId=${orderId}&Status=OK`,
      cancelUrl: `http://localhost:3000/payment/mock-pay?Authority=${authority}&orderId=${orderId}&Status=NOK`,
      message: 'لینک پرداخت تستی ساخته شد',
    };
  }

  private async verifyMockPayment(
    authority: string,
    orderId: number,
    status?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        authority,
      },
    });

    if (!order) {
      throw new NotFoundException('سفارش پرداختی پیدا نشد');
    }

    if (order.status === OrderStatus.paid) {
      return {
        success: true,
        provider: 'mock',
        message: 'این سفارش قبلاً پرداخت شده است',
        orderId: order.id,
        status: order.status,
        authority,
        refId: `MOCK-REF-${order.id}`,
        order: this.formatOrder(order),
      };
    }

    if (status && status !== 'OK') {
      const failedOrder = await this.prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.failed,
        },
      });

      return {
        success: false,
        provider: 'mock',
        orderId: failedOrder.id,
        status: failedOrder.status,
        authority,
        message: 'پرداخت تستی لغو یا ناموفق شد',
        order: this.formatOrder(failedOrder),
      };
    }

    if (order.status !== OrderStatus.pending && order.status !== OrderStatus.failed) {
      throw new BadRequestException('این سفارش قابل تأیید پرداخت نیست');
    }

    const paidOrder = await this.prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.paid,
      },
    });

    return {
      success: true,
      provider: 'mock',
      orderId: paidOrder.id,
      status: paidOrder.status,
      authority,
      refId: `MOCK-REF-${paidOrder.id}`,
      message: 'پرداخت تستی با موفقیت تأیید شد',
      order: this.formatOrder(paidOrder),
    };
  }

  private async createZarinpalPayment(orderId: number, amount: number) {
    const merchantId = this.configService.get<string>('ZARINPAL_MERCHANT');

    if (!merchantId) {
      throw new InternalServerErrorException(
        'مرچنت زرین‌پال تنظیم نشده است',
      );
    }

    const callbackBaseUrl =
      this.configService.get<string>('PAYMENT_CALLBACK_BASE_URL') ??
      'http://localhost:3000';

    const callbackUrl = `${callbackBaseUrl}/payment/verify?orderId=${orderId}`;

    try {
      const res = await axios.post(
        'https://api.zarinpal.com/pg/v4/payment/request.json',
        {
          merchant_id: merchantId,
          amount,
          callback_url: callbackUrl,
          description: `Feloral Order #${orderId}`,
        },
      );

      const data = res.data?.data;
      const errors = res.data?.errors;

      if (!data?.authority) {
        return {
          success: false,
          provider: 'zarinpal',
          orderId,
          amount,
          gatewayErrors: errors ?? null,
          message: 'درخواست پرداخت از زرین‌پال ناموفق بود',
        };
      }

      const authority = data.authority;

      const order = await this.prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          authority,
          status: OrderStatus.pending,
        },
      });

      return {
        success: true,
        provider: 'zarinpal',
        orderId,
        authority,
        amount,
        order: this.formatOrder(order),
        url: `https://www.zarinpal.com/pg/StartPay/${authority}`,
      };
    } catch (error) {
      console.error('ZARINPAL REQUEST ERROR:', error?.response?.data ?? error);

      throw new InternalServerErrorException(
        'خطا در اتصال به درگاه پرداخت',
      );
    }
  }

  private async verifyZarinpalPayment(
    authority: string,
    orderId: number,
    status?: string,
  ) {
    if (status && status !== 'OK') {
      const failedOrder = await this.prisma.order.updateMany({
        where: {
          id: orderId,
          authority,
          status: OrderStatus.pending,
        },
        data: {
          status: OrderStatus.failed,
        },
      });

      return {
        success: false,
        provider: 'zarinpal',
        updated: failedOrder.count,
        message: 'پرداخت توسط کاربر یا درگاه لغو شد',
      };
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        authority,
      },
    });

    if (!order) {
      throw new NotFoundException('سفارش پرداختی پیدا نشد');
    }

    if (order.status === OrderStatus.paid) {
      return {
        success: true,
        provider: 'zarinpal',
        message: 'این سفارش قبلاً پرداخت شده است',
        orderId: order.id,
        status: order.status,
        order: this.formatOrder(order),
      };
    }

    if (order.status !== OrderStatus.pending && order.status !== OrderStatus.failed) {
      throw new BadRequestException('این سفارش قابل تأیید پرداخت نیست');
    }

    const merchantId = this.configService.get<string>('ZARINPAL_MERCHANT');

    if (!merchantId) {
      throw new InternalServerErrorException(
        'مرچنت زرین‌پال تنظیم نشده است',
      );
    }

    try {
      const res = await axios.post(
        'https://api.zarinpal.com/pg/v4/payment/verify.json',
        {
          merchant_id: merchantId,
          authority,
          amount: Number(order.total),
        },
      );

      const data = res.data?.data;
      const errors = res.data?.errors;
      const code = data?.code;

      if (code === 100 || code === 101) {
        const paidOrder = await this.prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: OrderStatus.paid,
          },
        });

        return {
          success: true,
          provider: 'zarinpal',
          orderId: paidOrder.id,
          status: paidOrder.status,
          authority,
          refId: data?.ref_id ?? null,
          cardPan: data?.card_pan ?? null,
          message: 'پرداخت با موفقیت تأیید شد',
          order: this.formatOrder(paidOrder),
        };
      }

      const failedOrder = await this.prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.failed,
        },
      });

      return {
        success: false,
        provider: 'zarinpal',
        orderId: failedOrder.id,
        status: failedOrder.status,
        authority,
        gatewayCode: code ?? null,
        gatewayErrors: errors ?? null,
        message: 'تأیید پرداخت ناموفق بود',
        order: this.formatOrder(failedOrder),
      };
    } catch (error) {
      console.error('ZARINPAL VERIFY ERROR:', error?.response?.data ?? error);

      throw new InternalServerErrorException(
        'خطا در تأیید پرداخت',
      );
    }
  }
}