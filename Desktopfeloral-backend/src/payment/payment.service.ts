import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentAttemptStatus, Prisma } from '@prisma/client';
import axios from 'axios';

import { OrderService } from '../order/order.service';
import { toSafeGatewayAmount } from '../order/order.utils';
import { PrismaService } from '../prisma/prisma.service';
import { PostexService } from '../postex/postex.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly orderService: OrderService,
    private readonly postexService: PostexService,
  ) {}

  async createPayment(orderId: number, userId: number) {
    const order = await this.orderService.getPayableOrder(orderId, userId);
    const amountDecimal = new Prisma.Decimal(order.payableTotal || order.total);
    const amount = toSafeGatewayAmount(amountDecimal);

    const merchantId = this.configService.getOrThrow<string>(
      'ZARINPAL_MERCHANT_ID',
    );
    const callbackBase = this.configService.get<string>(
      'PAYMENT_CALLBACK_URL',
      'http://localhost:3000/payment/verify',
    );

    let callbackUrl: string;

    try {
      const url = new URL(callbackBase);
      url.searchParams.set('orderId', String(order.id));
      callbackUrl = url.toString();
    } catch {
      throw new BadRequestException('آدرس بازگشت پرداخت معتبر نیست');
    }

    let responseData: any;

    try {
      const response = await axios.post(
        'https://api.zarinpal.com/pg/v4/payment/request.json',
        {
          merchant_id: merchantId,
          amount,
          callback_url: callbackUrl,
          description: `Feloral order #${order.id}`,
        },
        {
          timeout: this.getPaymentTimeoutMs(),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      responseData = response.data;
    } catch (error) {
      throw new BadGatewayException(
        this.extractGatewayError(error, 'ارتباط با درگاه پرداخت برقرار نشد'),
      );
    }

    const code = Number(responseData?.data?.code);
    const authority = String(responseData?.data?.authority || '').trim();

    if (code !== 100 || !authority) {
      throw new BadGatewayException(
        responseData?.errors?.message ||
          responseData?.data?.message ||
          'درگاه پرداخت Authority معتبر برنگرداند',
      );
    }

    const existingAttempt = await this.prisma.paymentAttempt.findUnique({
      where: { authority },
    });

    if (existingAttempt && existingAttempt.orderId !== order.id) {
      throw new ConflictException('Authority به سفارش دیگری متصل است');
    }

    await this.prisma.$transaction([
      existingAttempt
        ? this.prisma.paymentAttempt.update({
            where: { id: existingAttempt.id },
            data: {
              amount: amountDecimal,
              status: PaymentAttemptStatus.requested,
              gatewayCode: code,
              rawResponse: this.asJson(responseData),
            },
          })
        : this.prisma.paymentAttempt.create({
            data: {
              orderId: order.id,
              authority,
              amount: amountDecimal,
              status: PaymentAttemptStatus.requested,
              gatewayCode: code,
              rawResponse: this.asJson(responseData),
            },
          }),
      this.prisma.order.update({
        where: { id: order.id },
        data: { authority },
      }),
    ]);

    return {
      authority,
      amount,
      url: `https://www.zarinpal.com/pg/StartPay/${authority}`,
      reservationExpiresAt: order.reservationExpiresAt,
    };
  }

  async verifyPayment(
    authority: string,
    orderId: number,
    callbackStatus?: string,
  ) {
    const normalizedAuthority = authority?.trim();

    if (!normalizedAuthority || !Number.isInteger(orderId) || orderId <= 0) {
      throw new BadRequestException('اطلاعات تأیید پرداخت ناقص است');
    }

    let attempt = await this.prisma.paymentAttempt.findUnique({
      where: { authority: normalizedAuthority },
      include: { order: true },
    });

    if (!attempt) {
      const legacyOrder = await this.prisma.order.findFirst({
        where: { id: orderId, authority: normalizedAuthority },
      });

      if (!legacyOrder) {
        throw new NotFoundException('تلاش پرداخت پیدا نشد');
      }

      attempt = await this.prisma.paymentAttempt.create({
        data: {
          orderId: legacyOrder.id,
          authority: normalizedAuthority,
          amount: legacyOrder.payableTotal || legacyOrder.total,
          status:
            legacyOrder.status === 'paid'
              ? PaymentAttemptStatus.verified
              : PaymentAttemptStatus.requested,
        },
        include: { order: true },
      });
    }

    if (attempt.orderId !== orderId) {
      throw new BadRequestException('Authority متعلق به این سفارش نیست');
    }

    if (
      attempt.status === PaymentAttemptStatus.verified ||
      attempt.order.status === 'paid'
    ) {
      const shipment = await this.tryCreatePostexShipment(attempt.orderId);
      return {
        success: true,
        alreadyPaid: true,
        refId: attempt.refId || attempt.order.paymentRefId,
        shipment,
      };
    }

    if (callbackStatus && callbackStatus.toUpperCase() !== 'OK') {
      await this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: PaymentAttemptStatus.failed,
          rawResponse: this.asJson({ callbackStatus }),
        },
      });

      return { success: false, canceled: true };
    }

    const merchantId = this.configService.getOrThrow<string>(
      'ZARINPAL_MERCHANT_ID',
    );
    const amountDecimal = new Prisma.Decimal(attempt.amount);
    const amount = toSafeGatewayAmount(amountDecimal);

    let responseData: any;

    try {
      const response = await axios.post(
        'https://api.zarinpal.com/pg/v4/payment/verify.json',
        {
          merchant_id: merchantId,
          authority: normalizedAuthority,
          amount,
        },
        {
          timeout: this.getPaymentTimeoutMs(),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      responseData = response.data;
    } catch (error) {
      throw new BadGatewayException(
        this.extractGatewayError(error, 'تأیید پرداخت از درگاه ممکن نشد'),
      );
    }

    const code = Number(responseData?.data?.code);
    const refId = responseData?.data?.ref_id
      ? String(responseData.data.ref_id)
      : undefined;
    const cardPan = responseData?.data?.card_pan
      ? String(responseData.data.card_pan)
      : undefined;

    if (code !== 100 && code !== 101) {
      await this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: PaymentAttemptStatus.failed,
          gatewayCode: Number.isFinite(code) ? code : undefined,
          rawResponse: this.asJson(responseData),
        },
      });

      return { success: false, code };
    }

    let finalized: Awaited<ReturnType<OrderService['finalizePaidOrder']>>;

    try {
      finalized = await this.orderService.finalizePaidOrder(orderId, {
        authority: normalizedAuthority,
        refId,
        cardPan,
      });
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;

      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'failed',
            authority: normalizedAuthority,
          },
        }),
        this.prisma.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: PaymentAttemptStatus.review_required,
            gatewayCode: code,
            refId,
            cardPan,
            rawResponse: this.asJson(responseData),
            verifiedAt: new Date(),
          },
        }),
      ]);

      throw new ConflictException(
        'پرداخت موفق بوده اما موجودی سفارش کافی نیست؛ سفارش نیازمند بررسی و استرداد دستی است',
      );
    }

    await this.prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: PaymentAttemptStatus.verified,
        gatewayCode: code,
        refId,
        cardPan,
        rawResponse: this.asJson(responseData),
        verifiedAt: new Date(),
      },
    });

    const shipment = await this.tryCreatePostexShipment(orderId);

    return {
      success: true,
      alreadyPaid: finalized.alreadyPaid || code === 101,
      refId,
      cardPan,
      orderId,
      shipment,
    };
  }

  private async tryCreatePostexShipment(orderId: number) {
    try {
      return await this.postexService.ensureShipmentForPaidOrder(orderId);
    } catch (error) {
      return {
        created: false,
        pendingRetry: true,
        error: error instanceof Error ? error.message : 'POSTEX_SHIPMENT_FAILED',
      };
    }
  }

  private getPaymentTimeoutMs() {
    const configured = Number(
      this.configService.get<string | number>('PAYMENT_HTTP_TIMEOUT_MS'),
    );

    if (
      Number.isInteger(configured) &&
      configured >= 3000 &&
      configured <= 30000
    ) {
      return configured;
    }

    return 10_000;
  }

  private extractGatewayError(error: unknown, fallback: string) {
    if (axios.isAxiosError(error)) {
      return (
        error.response?.data?.errors?.message ||
        error.response?.data?.data?.message ||
        error.message ||
        fallback
      );
    }

    return fallback;
  }

  private asJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }
}
