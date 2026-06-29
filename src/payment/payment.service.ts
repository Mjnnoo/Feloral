import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createPayment(orderId: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Order is not payable');
    }

    const provider =
      this.configService.get<string>('PAYMENT_PROVIDER') ?? 'mock';

    if (provider === 'mock') {
      return this.createMockPayment(order.id, Number(order.total));
    }

    return this.createZarinpalPayment(order.id, Number(order.total));
  }

  async verifyPayment(
    authority: string,
    orderId: number,
    status?: string,
  ) {
    if (!authority) {
      throw new BadRequestException('Authority is required');
    }

    const provider =
      this.configService.get<string>('PAYMENT_PROVIDER') ?? 'mock';

    if (provider === 'mock') {
      return this.verifyMockPayment(authority, orderId, status);
    }

    return this.verifyZarinpalPayment(authority, orderId, status);
  }

  private async createMockPayment(orderId: number, amount: number) {
    const authority = `MOCK-${orderId}-${Date.now()}`;

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        authority,
      },
    });

    return {
      success: true,
      provider: 'mock',
      orderId,
      authority,
      amount,
      url: `http://localhost:3000/payment/mock-pay?Authority=${authority}&orderId=${orderId}`,
      message: 'Mock payment created successfully',
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
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'paid') {
      return {
        success: true,
        provider: 'mock',
        message: 'Order already paid',
        orderId: order.id,
      };
    }

    if (status && status !== 'OK') {
      const failedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'failed',
        },
      });

      return {
        success: false,
        provider: 'mock',
        orderId: failedOrder.id,
        status: failedOrder.status,
        message: 'Mock payment canceled',
      };
    }

    const paidOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'paid',
      },
    });

    return {
      success: true,
      provider: 'mock',
      orderId: paidOrder.id,
      status: paidOrder.status,
      authority,
      refId: `MOCK-REF-${paidOrder.id}`,
      message: 'Mock payment verified successfully',
    };
  }

  private async createZarinpalPayment(
    orderId: number,
    amount: number,
  ) {
    const merchantId =
      this.configService.get<string>('ZARINPAL_MERCHANT');

    if (!merchantId) {
      throw new InternalServerErrorException(
        'Zarinpal merchant id is not configured',
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

      if (!data?.authority) {
        throw new BadRequestException('Payment request failed');
      }

      const authority = data.authority;

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          authority,
        },
      });

      return {
        success: true,
        provider: 'zarinpal',
        orderId,
        authority,
        amount,
        url: `https://www.zarinpal.com/pg/StartPay/${authority}`,
      };
    } catch (error) {
      console.error('ZARINPAL REQUEST ERROR:', error?.response?.data ?? error);

      throw new InternalServerErrorException(
        'Payment gateway request failed',
      );
    }
  }

  private async verifyZarinpalPayment(
    authority: string,
    orderId: number,
    status?: string,
  ) {
    if (status && status !== 'OK') {
      await this.prisma.order.updateMany({
        where: {
          id: orderId,
          authority,
          status: 'pending',
        },
        data: {
          status: 'failed',
        },
      });

      return {
        success: false,
        provider: 'zarinpal',
        message: 'Payment canceled by user or gateway',
      };
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        authority,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'paid') {
      return {
        success: true,
        provider: 'zarinpal',
        message: 'Order already paid',
        orderId: order.id,
      };
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Order is not verifiable');
    }

    const merchantId =
      this.configService.get<string>('ZARINPAL_MERCHANT');

    if (!merchantId) {
      throw new InternalServerErrorException(
        'Zarinpal merchant id is not configured',
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
      const code = data?.code;

      if (code === 100 || code === 101) {
        const paidOrder = await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'paid',
          },
        });

        return {
          success: true,
          provider: 'zarinpal',
          orderId: paidOrder.id,
          status: paidOrder.status,
          refId: data?.ref_id ?? null,
          cardPan: data?.card_pan ?? null,
        };
      }

      const failedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'failed',
        },
      });

      return {
        success: false,
        provider: 'zarinpal',
        orderId: failedOrder.id,
        status: failedOrder.status,
        gatewayCode: code ?? null,
      };
    } catch (error) {
      console.error('ZARINPAL VERIFY ERROR:', error?.response?.data ?? error);

      throw new InternalServerErrorException(
        'Payment verification failed',
      );
    }
  }
}