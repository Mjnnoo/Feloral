import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { PostexService } from '../shipping/postex.service';

type PostexTrackingAttempt = {
  type: string;
  path: string;
  success: boolean;
  response?: unknown;
  error?: unknown;
};

@Injectable()
export class OrderPostexTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postexService: PostexService,
  ) {}

  async getTracking(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        status: true,
        shippingStatus: true,
        shipmentCreatedAt: true,
        shipmentError: true,

        trackingCode: true,
        trackingUrl: true,
        providerOrderId: true,

        postexCourierCode: true,
        postexServiceType: true,
        postexShipmentSnapshot: true,
      },
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    if (!order.shipmentCreatedAt) {
      throw new BadRequestException(
        'این سفارش هنوز در پستکس ثبت نشده است',
      );
    }

    const attempts: PostexTrackingAttempt[] = [];

    if (order.trackingCode && order.postexCourierCode) {
      const trackingPath = `/api/v1/tracking/events/${encodeURIComponent(
        order.postexCourierCode,
      )}/${encodeURIComponent(order.trackingCode)}`;

      const trackingAttempt = await this.safePostexGet(
        'tracking_code',
        trackingPath,
      );

      attempts.push(trackingAttempt);

      if (trackingAttempt.success) {
        return {
          message: 'اطلاعات رهگیری مرسوله با موفقیت دریافت شد',
          orderId: order.id,
          source: 'tracking_code',
          tracking: {
            trackingCode: order.trackingCode,
            trackingUrl: order.trackingUrl,
            providerOrderId: order.providerOrderId,
            courierCode: order.postexCourierCode,
            serviceType: order.postexServiceType,
          },
          attempts,
          response: trackingAttempt.response,
        };
      }
    }

    const lookupPaths = [
      {
        type: 'custom_reference_no',
        path: `/api/v1/parcels?custom_reference_no=${encodeURIComponent(
          String(order.id),
        )}`,
      },
      {
        type: 'custom_order_no',
        path: `/api/v1/parcels?custom_order_no=${encodeURIComponent(
          this.buildCustomOrderNo(order.id),
        )}`,
      },
    ];

    for (const lookup of lookupPaths) {
      const attempt = await this.safePostexGet(lookup.type, lookup.path);

      attempts.push(attempt);

      if (!attempt.success) {
        continue;
      }

      const extractedTrackingCode = this.extractTrackingCode(
        attempt.response,
      );
      const extractedProviderOrderId = this.extractProviderOrderId(
        attempt.response,
      );
      const extractedTrackingUrl = this.extractTrackingUrl(
        attempt.response,
      );

      if (
        extractedTrackingCode ||
        extractedProviderOrderId ||
        extractedTrackingUrl
      ) {
        const updateData: Record<string, unknown> = {};

        if (extractedTrackingCode && !order.trackingCode) {
          updateData.trackingCode = extractedTrackingCode;
        }

        if (extractedProviderOrderId && !order.providerOrderId) {
          updateData.providerOrderId = extractedProviderOrderId;
        }

        if (extractedTrackingUrl && !order.trackingUrl) {
          updateData.trackingUrl = extractedTrackingUrl;
        }

        if (Object.keys(updateData).length > 0) {
          await this.prisma.order.update({
            where: {
              id: order.id,
            },
            data: updateData,
          });
        }

        return {
          message: 'مرسوله از پستکس پیدا شد و اطلاعات رهگیری به‌روزرسانی شد',
          orderId: order.id,
          source: lookup.type,
          tracking: {
            trackingCode: extractedTrackingCode || order.trackingCode,
            trackingUrl: extractedTrackingUrl || order.trackingUrl,
            providerOrderId:
              extractedProviderOrderId || order.providerOrderId,
            courierCode: order.postexCourierCode,
            serviceType: order.postexServiceType,
          },
          attempts,
          response: attempt.response,
        };
      }
    }

    return {
      message:
        'مرسوله در پستکس ثبت شده، اما اطلاعات رهگیری در پاسخ‌های فعلی پیدا نشد',
      orderId: order.id,
      tracking: {
        trackingCode: order.trackingCode,
        trackingUrl: order.trackingUrl,
        providerOrderId: order.providerOrderId,
        courierCode: order.postexCourierCode,
        serviceType: order.postexServiceType,
      },
      attempts,
      hint:
        'اگر پستکس کد رهگیری را با تأخیر صادر می‌کند، چند دقیقه بعد دوباره همین مسیر را تست کنید',
    };
  }

  private async safePostexGet(type: string, path: string) {
    try {
      const response = await this.postexService.request(path, 'GET');

      return {
        type,
        path,
        success: true,
        response,
      };
    } catch (error) {
      return {
        type,
        path,
        success: false,
        error: this.formatError(error),
      };
    }
  }

  private buildCustomOrderNo(orderId: number) {
    return `FEL-${String(orderId).padStart(6, '0')}`;
  }

  private findDeepValue(value: unknown, keys: string[]): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findDeepValue(item, keys);

        if (found) {
          return found;
        }
      }

      return null;
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;

      for (const key of keys) {
        const directValue = record[key];

        if (
          directValue !== null &&
          directValue !== undefined &&
          String(directValue).trim() !== ''
        ) {
          return String(directValue);
        }
      }

      for (const nestedValue of Object.values(record)) {
        const found = this.findDeepValue(nestedValue, keys);

        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  private extractTrackingCode(response: unknown) {
    return this.findDeepValue(response, [
      'trackingCode',
      'tracking_code',
      'tracking_number',
      'trackingNumber',
      'barcode',
      'barcode_no',
      'waybill_number',
      'waybillNumber',
      'shipment_code',
      'shipmentCode',
      'parcel_code',
      'parcelCode',
    ]);
  }

  private extractProviderOrderId(response: unknown) {
    return this.findDeepValue(response, [
      'providerOrderId',
      'provider_order_id',
      'parcel_id',
      'parcelId',
      'postex_order_id',
      'postexOrderId',
      'order_no',
      'orderNo',
      'custom_order_no',
      'customOrderNo',
    ]);
  }

  private extractTrackingUrl(response: unknown) {
    return this.findDeepValue(response, [
      'trackingUrl',
      'tracking_url',
      'tracking_link',
      'trackingLink',
    ]);
  }

  private formatError(error: unknown) {
    if (error instanceof BadRequestException) {
      return error.getResponse();
    }

    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    return error;
  }
}
