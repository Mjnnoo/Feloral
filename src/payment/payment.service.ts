import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma, ShippingStatus } from '@prisma/client';
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

  private getPayableAmount(order: any) {
    const payableTotal = Number(order.payableTotal ?? 0);
    const total = Number(order.total ?? 0);

    if (payableTotal > 0) {
      return payableTotal;
    }

    return total;
  }

  private formatOrder(order: any) {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,

      subtotal: Number(order.subtotal ?? 0),
      discountTotal: Number(order.discountTotal ?? 0),
      shippingCost: Number(order.shippingCost ?? 0),
      payableTotal: Number(order.payableTotal ?? 0),
      total: Number(order.total ?? 0),

      shippingStatus: order.shippingStatus,
      authority: order.authority,

      postex: {
        cityId: order.postexCityId,
        boxTypeId: order.postexBoxTypeId,
        packageTitle: order.postexPackageTitle,
        packageCode: order.postexPackageCode,
        courierCode: order.postexCourierCode,
        serviceType: order.postexServiceType,
        serviceName: order.postexServiceName,
        estimatedDelivery: order.postexEstimatedDelivery,
      },

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private async failPendingOrderAndRestoreStock(
    authority: string,
    orderId: number,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          authority,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundException('سفارش پرداختی پیدا نشد');
      }

      if (order.status === OrderStatus.paid) {
        throw new BadRequestException(
          'سفارش پرداخت‌شده قابل ناموفق شدن نیست',
        );
      }

      if (order.status === OrderStatus.failed) {
        return {
          order,
          restoredStock: false,
          alreadyFailed: true,
        };
      }

      if (order.status !== OrderStatus.pending) {
        throw new BadRequestException(
          'این سفارش در وضعیت قابل ناموفق شدن نیست',
        );
      }

      for (const item of order.items) {
        if (item.variantId && item.quantity > 0) {
          await tx.productVariant.update({
            where: {
              id: item.variantId,
            },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      const failedOrder = await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.failed,
        },
        include: {
          items: true,
        },
      });

      return {
        order: failedOrder,
        restoredStock: true,
        alreadyFailed: false,
      };
    });
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

    if (order.status === OrderStatus.failed) {
      throw new BadRequestException(
        'این سفارش ناموفق شده و قابل پرداخت مجدد نیست. لطفاً سفارش جدید ثبت کنید',
      );
    }

    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('این سفارش قابل پرداخت نیست');
    }

    const amount = this.getPayableAmount(order);

    if (amount <= 0) {
      throw new BadRequestException('مبلغ سفارش نامعتبر است');
    }

    const provider = this.getProvider();

    if (provider === 'mock') {
      return this.createMockPayment(order.id, amount);
    }

    if (provider === 'zarinpal') {
      return this.createZarinpalPayment(order.id, amount);
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
        shippingStatus: order.shippingStatus,

        amount: this.getPayableAmount(order),
        subtotal: Number(order.subtotal ?? 0),
        shippingCost: Number(order.shippingCost ?? 0),
        payableTotal: Number(order.payableTotal ?? 0),

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
        shippingStatus: order.shippingStatus,
        authority,
        refId: `MOCK-REF-${order.id}`,
        amount: this.getPayableAmount(order),
        order: this.formatOrder(order),
      };
    }

    if (status && status !== 'OK') {
      const failedResult = await this.failPendingOrderAndRestoreStock(
        authority,
        orderId,
      );

      return {
        success: false,
        provider: 'mock',
        orderId: failedResult.order.id,
        status: failedResult.order.status,
        shippingStatus: failedResult.order.shippingStatus,
        authority,
        amount: this.getPayableAmount(failedResult.order),
        stockRestored: failedResult.restoredStock,
        alreadyFailed: failedResult.alreadyFailed,
        message: failedResult.alreadyFailed
          ? 'این سفارش قبلاً ناموفق شده بود'
          : 'پرداخت تستی لغو یا ناموفق شد و موجودی کالا به انبار برگشت',
        order: this.formatOrder(failedResult.order),
      };
    }

    if (order.status === OrderStatus.failed) {
      throw new BadRequestException(
        'این سفارش ناموفق شده و قابل تأیید پرداخت نیست. لطفاً سفارش جدید ثبت کنید',
      );
    }

    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('این سفارش قابل تأیید پرداخت نیست');
    }

    const paidOrder = await this.prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.paid,
        shippingStatus: ShippingStatus.preparing,
      },
    });

    return {
      success: true,
      provider: 'mock',
      orderId: paidOrder.id,
      status: paidOrder.status,
      shippingStatus: paidOrder.shippingStatus,
      authority,
      refId: `MOCK-REF-${paidOrder.id}`,
      amount: this.getPayableAmount(paidOrder),
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
      const failedResult = await this.failPendingOrderAndRestoreStock(
        authority,
        orderId,
      );

      return {
        success: false,
        provider: 'zarinpal',
        orderId: failedResult.order.id,
        status: failedResult.order.status,
        shippingStatus: failedResult.order.shippingStatus,
        authority,
        amount: this.getPayableAmount(failedResult.order),
        stockRestored: failedResult.restoredStock,
        alreadyFailed: failedResult.alreadyFailed,
        message: failedResult.alreadyFailed
          ? 'این سفارش قبلاً ناموفق شده بود'
          : 'پرداخت توسط کاربر یا درگاه لغو شد و موجودی کالا به انبار برگشت',
        order: this.formatOrder(failedResult.order),
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
        shippingStatus: order.shippingStatus,
        amount: this.getPayableAmount(order),
        order: this.formatOrder(order),
      };
    }

    if (order.status === OrderStatus.failed) {
      throw new BadRequestException(
        'این سفارش ناموفق شده و قابل تأیید پرداخت نیست. لطفاً سفارش جدید ثبت کنید',
      );
    }

    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('این سفارش قابل تأیید پرداخت نیست');
    }

    const merchantId = this.configService.get<string>('ZARINPAL_MERCHANT');

    if (!merchantId) {
      throw new InternalServerErrorException(
        'مرچنت زرین‌پال تنظیم نشده است',
      );
    }

    const amount = this.getPayableAmount(order);

    if (amount <= 0) {
      throw new BadRequestException('مبلغ سفارش نامعتبر است');
    }

    try {
      const res = await axios.post(
        'https://api.zarinpal.com/pg/v4/payment/verify.json',
        {
          merchant_id: merchantId,
          authority,
          amount,
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
            shippingStatus: ShippingStatus.preparing,
          },
        });

        return {
          success: true,
          provider: 'zarinpal',
          orderId: paidOrder.id,
          status: paidOrder.status,
          shippingStatus: paidOrder.shippingStatus,
          authority,
          amount,
          refId: data?.ref_id ?? null,
          cardPan: data?.card_pan ?? null,
          message: 'پرداخت با موفقیت تأیید شد',
          order: this.formatOrder(paidOrder),
        };
      }

      const failedResult = await this.failPendingOrderAndRestoreStock(
        authority,
        order.id,
      );

      return {
        success: false,
        provider: 'zarinpal',
        orderId: failedResult.order.id,
        status: failedResult.order.status,
        shippingStatus: failedResult.order.shippingStatus,
        authority,
        amount,
        gatewayCode: code ?? null,
        gatewayErrors: errors ?? null,
        stockRestored: failedResult.restoredStock,
        alreadyFailed: failedResult.alreadyFailed,
        message: failedResult.alreadyFailed
          ? 'این سفارش قبلاً ناموفق شده بود'
          : 'تأیید پرداخت ناموفق بود و موجودی کالا به انبار برگشت',
        order: this.formatOrder(failedResult.order),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      console.error('ZARINPAL VERIFY ERROR:', error?.response?.data ?? error);

      throw new InternalServerErrorException(
        'خطا در تأیید پرداخت',
      );
    }
  }
}
