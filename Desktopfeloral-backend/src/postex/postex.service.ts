import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';

import { effectivePrice } from '../order/order.utils';

type ShippingStatusValue =
  | 'not_shipped'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'canceled';

const SHIPPING_STATUS = {
  not_shipped: 'not_shipped',
  preparing: 'preparing',
  shipped: 'shipped',
  delivered: 'delivered',
  returned: 'returned',
  canceled: 'canceled',
} as const;
import { PrismaService } from '../prisma/prisma.service';
import { PostexQuoteDto } from './dto/postex-quote.dto';
import { UpsertShippingOriginDto } from './dto/upsert-shipping-origin.dto';
import { PostexClient } from './postex.client';
import {
  buildCartFingerprint,
  extractShipmentIdentity,
  mapPostexShippingStatus,
  normalizeQuoteOptions,
  pickString,
  summarizeParcel,
  verifyWebhookSecret,
} from './postex.utils';

@Injectable()
export class PostexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly client: PostexClient,
  ) {}

  async searchCities(search?: string, province?: string) {
  let response;

  if (province) {
    response = await this.client.destinationCitiesByProvince(
      province,
    );
  } else {
    response = await this.client.cities({
      search,
      q: search,
    });
  }

  return {
    items: this.extractCollection(response),
    raw: response,
  };
}

  async boxTypes() {
    const response = await this.client.boxTypes();
    return { items: this.extractCollection(response), raw: response };
  }

  async testConnection() {
    const result = await this.client.testConnection();
    return { success: true, response: result };
  }

  async getActiveOrigin() {
    const origin = await (this.prisma as any).shippingOrigin.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!origin) throw new NotFoundException('مبدا فعال فروشگاه ثبت نشده است');
    return origin;
  }

  adminListOrigins() {
    return (this.prisma as any).shippingOrigin.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async upsertOrigin(dto: UpsertShippingOriginDto) {
    return this.prisma.$transaction(async (typedTx) => {
      const tx = typedTx as any;
      if (dto.isActive !== false) {
        await tx.shippingOrigin.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      const existing = await tx.shippingOrigin.findFirst({
        where: {
          senderMobile: dto.senderMobile,
          postexCityId: dto.postexCityId,
          addressLine: dto.addressLine,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const data = {
        ...dto,
        isActive: dto.isActive !== false,
      };

      return existing
        ? tx.shippingOrigin.update({ where: { id: existing.id }, data })
        : tx.shippingOrigin.create({ data });
    });
  }

  async deactivateOrigin(id: number) {
    const result = await (this.prisma as any).shippingOrigin.updateMany({
      where: { id, isActive: true },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('مبدا فعال پیدا نشد');
    return { success: true };
  }

  async quote(userId: number, dto: PostexQuoteDto) {
  const [cart, address, origin] = await Promise.all([
    this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { id: 'asc' },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    }),

    (this.prisma as any).address.findFirst({
      where: {
        id: dto.addressId,
        userId,
        isActive: true,
      },
    }),

    (this.prisma as any).shippingOrigin.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    }),
  ]);


  if (!cart || cart.items.length === 0) {
    throw new BadRequestException('سبد خرید خالی است');
  }

  if (!address) {
    throw new NotFoundException('آدرس مقصد پیدا نشد');
  }

  if (!origin) {
    throw new ServiceUnavailableException(
      'مبدا فعال فروشگاه تنظیم نشده است',
    );
  }


  if (!address.postexCityId) {
    throw new BadRequestException(
      'شناسه شهر Postex برای آدرس مقصد ثبت نشده است',
    );
  }

  if (!origin.postexCityId) {
    throw new BadRequestException(
      'شناسه شهر Postex برای مبدا ثبت نشده است',
    );
  }


  let subtotal = new Prisma.Decimal(0);

  for (const item of cart.items) {
    if (
      !item.variant.isActive ||
      !item.variant.product.isActive
    ) {
      throw new BadRequestException(
        'سبد خرید شامل کالای غیرفعال است',
      );
    }

    subtotal = subtotal.plus(
      effectivePrice(item.variant).mul(item.quantity),
    );
  }


  const parcel = summarizeParcel(cart.items);


  const fingerprint = buildCartFingerprint(
    cart.items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      price: effectivePrice(item.variant),
    })),
  );


  const requestPayload = this.buildQuotePayload(
    userId,
    origin,
    address,
    cart.items,
    parcel,
    subtotal,
    dto,
  );


    const response = await this.client.quote(requestPayload);


  
  const options = normalizeQuoteOptions(response);


  
  if (options.length === 0) {
    throw new BadRequestException(
      'Postex هیچ سرویس قابل استفاده‌ای برنگرداند',
    );
  }


  const expiresAt = new Date(
    Date.now() + this.quoteTtlMinutes() * 60_000,
  );


  const internalExtraCost = this.internalExtraCost();

  const markupPercent = this.markupPercent();

  const freeShippingAbove = this.freeShippingAbove();



  const created = await this.prisma.$transaction(
    async (typedTx) => {

      const tx = typedTx as any;


      await tx.postexQuote.updateMany({
        where: {
          userId,
          consumedAt: null,
          expiresAt: {
            lte: new Date(),
          },
        },
        data: {
          invalidatedAt: new Date(),
        },
      });


      const rows = [];


      for (const option of options) {

        const providerPrice =
          new Prisma.Decimal(option.providerPrice);


        const percentageMarkup =
          Math.round(
            (providerPrice.toNumber() *
              markupPercent) /
              100,
          );


        const markup =
          new Prisma.Decimal(
            percentageMarkup,
          ).plus(
            internalExtraCost,
          );


        const customerPrice =
          freeShippingAbove &&
          !subtotal.lessThan(freeShippingAbove)
            ? new Prisma.Decimal(0)
            : providerPrice.plus(markup);



        const row = await tx.postexQuote.create({
          data: {

            userId,

            addressId: address.id,

            originId: origin.id,


            serviceCode:
              option.serviceCode,

            courierCode:
              option.courierCode,

            serviceName:
              option.serviceName,

            serviceType:
              option.serviceType,


            providerPrice,

            internalExtraCost,

            customerPrice,


            estimatedDelivery:
              option.estimatedDelivery,


            boxTypeId:
              option.boxTypeId ?? dto.boxTypeId,


            packageCode:
              option.packageCode ?? dto.packageCode,


            packageTitle:
              option.packageTitle ?? dto.packageTitle,


            paymentType:
              dto.paymentType || 'prepaid',


            pickupType:
              dto.pickupType || 'pickup',


            insured:
              dto.insured ?? true,


            smsNotification:
              dto.smsNotification ?? true,


            packaging:
              dto.packaging ?? false,


            subtotalSnapshot:
              subtotal,


            totalWeightGram:
              parcel.totalWeightGram,


            lengthCm:
              parcel.lengthCm,


            widthCm:
              parcel.widthCm,


            heightCm:
              parcel.heightCm,


            cartFingerprint:
              fingerprint,


            requestSnapshot:
              this.asJson(requestPayload),


            responseSnapshot:
              this.asJson(option.raw),


            expiresAt,

          },
        });


        rows.push(row);
      }


      return rows;

    },
  );


  
  return {
    expiresAt,
    subtotal,
    parcel,

    options:
      created.map((row: any) =>
        this.safeQuote(row),
      ),

    raw: response,
  };
}
  async resolveQuoteForCheckout(
    tx: any,
    userId: number,
    addressId: number,
    quoteId: string,
    subtotal: Prisma.Decimal,
    cartItems: Array<any>,
  ) {
    const quote = await tx.postexQuote.findFirst({
      where: {
        id: quoteId,
        userId,
        addressId,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { origin: true, address: true },
    });

    if (!quote) {
      throw new BadRequestException('استعلام Postex منقضی یا نامعتبر است');
    }

    const fingerprint = buildCartFingerprint(
      cartItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        price: effectivePrice(item.variant),
      })),
    );

    if (quote.cartFingerprint !== fingerprint) {
      throw new ConflictException(
        'محتویات سبد خرید بعد از استعلام ارسال تغییر کرده است',
      );
    }

    if (!new Prisma.Decimal(quote.subtotalSnapshot).equals(subtotal)) {
      throw new ConflictException(
        'مبلغ سبد خرید بعد از استعلام ارسال تغییر کرده است',
      );
    }

    return {
      address: quote.address,
      method: null,
      postexQuote: quote,
      shippingCost: new Prisma.Decimal(quote.customerPrice),
      estimatedMinDays: null,
      estimatedMaxDays: null,
    };
  }

  markQuoteConsumed(tx: any, quoteId: string) {
    return tx.postexQuote.update({
      where: { id: quoteId },
      data: { consumedAt: new Date() },
    });
  }

  async ensureShipmentForPaidOrder(orderId: number) {
    const order = await (this.prisma as any).order.findUnique({
      where: { id: orderId },
      include: {
  items: {
    include: {
      variant: true,
    },
  },
  postexQuote: {
    include: {
      origin: true,
    },
  },
},
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    if (
      order.status !== OrderStatus.paid &&
      order.status !== OrderStatus.processing
    ) {
      throw new BadRequestException(
        'مرسوله Postex فقط برای سفارش پرداخت‌شده ساخته می‌شود',
      );
    }
    if (!order.postexQuote)
      return { skipped: true, reason: 'not_postex_order' };
    if (order.providerOrderId || order.trackingCode) {
      return { skipped: true, reason: 'already_created', order };
    }

    const payload = this.buildShipmentPayload(order);
    
    console.log(
  'POSTEX SHIPMENT PAYLOAD:',
  JSON.stringify(payload, null, 2),
);

    try {
      const response = await this.client.createShipment(
        payload,
        `feloral-order-${order.id}`,
      );
      const identity = extractShipmentIdentity(response);
      if (!identity.providerOrderId && !identity.trackingCode) {
        throw new BadRequestException(
          'Postex شناسه مرسوله یا کد رهگیری برنگرداند',
        );
      }

      const mappedStatus = mapPostexShippingStatus(identity.status);
      const updated = await this.prisma.$transaction(async (typedTx) => {
        const tx = typedTx as any;
        const saved = await tx.order.update({
          where: { id: order.id },
          data: {
            shippingProvider: 'postex',
            shippingStatus: mappedStatus,
            providerOrderId: identity.providerOrderId,
            trackingCode: identity.trackingCode,
            trackingUrl: identity.trackingUrl,
            postexLabelUrl: identity.labelUrl,
            postexInvoiceUrl: identity.invoiceUrl,
            postexLastStatus: identity.status,
            postexLastSyncedAt: new Date(),
            postexShipmentSnapshot: this.asJson(response),
            shipmentCreatedAt: new Date(),
            shipmentError: null,
          },
        });
        await tx.postexShipmentEvent.create({
          data: {
            orderId: order.id,
            source: 'api',
            providerStatus: identity.status,
            mappedStatus,
            payload: this.asJson(response),
          },
        });
        return saved;
      });

      return { created: true, order: updated, response };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'ساخت مرسوله Postex ناموفق بود';
      await (this.prisma as any).order.update({
        where: { id: order.id },
        data: { shipmentError: message.slice(0, 1000) },
      });
      throw error;
    }
  }

  async trackForUser(orderId: number, userId: number) {
    const order = await (this.prisma as any).order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    return this.trackOrder(orderId);
  }

  async trackOrder(orderId: number) {
    const order = await (this.prisma as any).order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    const shipmentId = order.providerOrderId || order.trackingCode;
    if (!shipmentId)
      throw new BadRequestException('مرسوله Postex هنوز ساخته نشده است');

    const response = await this.client.trackShipment(shipmentId);
    return this.applyTrackingResponse(order, response, 'sync');
  }

  async cancelShipment(orderId: number, actorUserId: number, reason?: string) {
    const order = await (this.prisma as any).order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    const shipmentId = order.providerOrderId || order.trackingCode;
    if (!shipmentId)
      throw new BadRequestException('مرسوله Postex ساخته نشده است');
    if (order.shippingStatus === SHIPPING_STATUS.delivered) {
      throw new BadRequestException('مرسوله تحویل‌شده قابل لغو نیست');
    }

    const response = await this.client.cancelShipment(shipmentId, reason);
    const updated = await (this.prisma as any).order.update({
      where: { id: order.id },
      data: {
        shippingStatus: 'canceled',
        postexCanceledAt: new Date(),
        postexLastStatus: 'canceled',
        postexLastSyncedAt: new Date(),
        shippingNote: reason || order.shippingNote,
      },
    });
    await (this.prisma as any).postexShipmentEvent.create({
      data: {
        orderId: order.id,
        source: 'manual',
        providerStatus: 'canceled',
        mappedStatus: 'canceled',
        payload: this.asJson({ actorUserId, reason, response }),
      },
    });
    return { success: true, order: updated, response };
  }

  async syncStale(limit = 25) {
    const orders = await (this.prisma as any).order.findMany({
      where: {
        shippingProvider: 'postex',
        providerOrderId: { not: null },
        shippingStatus: { in: ['preparing', 'shipped'] },
      },
      select: { id: true },
      orderBy: [{ postexLastSyncedAt: 'asc' }, { createdAt: 'asc' }],
      take: Math.max(1, Math.min(limit, 100)),
    });

    const results: Array<{
      orderId: number;
      success: boolean;
      error?: string;
    }> = [];
    for (const order of orders) {
      try {
        await this.trackOrder(order.id);
        results.push({ orderId: order.id, success: true });
      } catch (error) {
        results.push({
          orderId: order.id,
          success: false,
          error: error instanceof Error ? error.message : 'sync_failed',
        });
      }
    }
    return { processed: results.length, results };
  }

  async handleWebhook(
    payload: unknown,
    signature?: string,
    plainSecret?: string,
  ) {
    const configuredSecret = this.configService
      .get<string>('POSTEX_WEBHOOK_SECRET')
      ?.trim();
    if (
      !verifyWebhookSecret(configuredSecret, payload, signature, plainSecret)
    ) {
      throw new ForbiddenException('امضای Webhook پستکس معتبر نیست');
    }

    const identity = extractShipmentIdentity(payload);
    const reference = pickString(payload, [
      'reference',
      'orderReference',
      'merchantReference',
      'clientReference',
    ]);
    const feloralOrderId = reference?.match(
      /(?:feloral-order-|order-)?(\d+)/i,
    )?.[1];

    const references = [
      ...(identity.providerOrderId
        ? [{ providerOrderId: identity.providerOrderId }]
        : []),
      ...(identity.trackingCode
        ? [{ trackingCode: identity.trackingCode }]
        : []),
      ...(feloralOrderId ? [{ id: Number(feloralOrderId) }] : []),
    ];
    if (references.length === 0) {
      throw new BadRequestException('Webhook پستکس فاقد شناسه قابل تطبیق است');
    }

    const order = await (this.prisma as any).order.findFirst({
      where: { OR: references },
    });
    if (!order) throw new NotFoundException('سفارش متناظر Webhook پیدا نشد');

    return this.applyTrackingResponse(order, payload, 'webhook');
  }

  private async applyTrackingResponse(
    order: any,
    response: unknown,
    source: string,
  ) {
    const identity = extractShipmentIdentity(response);
    const mappedStatus = mapPostexShippingStatus(identity.status);
    const orderStatus = this.orderStatusFromShipping(
      order.status,
      mappedStatus,
    );

    const updated = await this.prisma.$transaction(async (typedTx) => {
      const tx = typedTx as any;
      const saved = await tx.order.update({
        where: { id: order.id },
        data: {
          shippingStatus: mappedStatus,
          status: orderStatus,
          providerOrderId: identity.providerOrderId || order.providerOrderId,
          trackingCode: identity.trackingCode || order.trackingCode,
          trackingUrl: identity.trackingUrl || order.trackingUrl,
          postexLabelUrl: identity.labelUrl || order.postexLabelUrl,
          postexInvoiceUrl: identity.invoiceUrl || order.postexInvoiceUrl,
          postexLastStatus: identity.status || order.postexLastStatus,
          postexLastSyncedAt: new Date(),
          shippedAt:
            mappedStatus === 'shipped' && !order.shippedAt
              ? new Date()
              : order.shippedAt,
          deliveredAt:
            mappedStatus === 'delivered' && !order.deliveredAt
              ? new Date()
              : order.deliveredAt,
        },
      });
      await tx.postexShipmentEvent.create({
        data: {
          orderId: order.id,
          source,
          providerStatus: identity.status,
          mappedStatus,
          payload: this.asJson(response),
        },
      });
      if (orderStatus !== order.status) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            actorUserId: null,
            fromStatus: order.status,
            toStatus: orderStatus,
            note: `وضعیت سفارش از همگام‌سازی Postex به ${orderStatus} تغییر کرد`,
            metadata: this.asJson({ source, mappedStatus }),
          },
        });
      }
      return saved;
    });

    return { order: updated, response };
  }

  private buildQuotePayload(
  userId: number,
  origin: any,
  address: any,
  items: any[],
  parcel: ReturnType<typeof summarizeParcel>,
  subtotal: Prisma.Decimal,
  dto: PostexQuoteDto,
) {
  return {
  collection_type: 'pick_up',

  courier: {
  courier_code: dto.courierCode || 'IR_POST',
  service_type: 'EXPRESS',
},

  from_city_code: origin.postexCityId,

  parcels: [
      {
        custom_parcel_id: `feloral-quote-${userId}-${Date.now()}`,

        to_city_code: address.postexCityId,

        payment_type: 'SENDER',

        parcel_properties: {
          length: parcel.lengthCm,
          width: parcel.widthCm,
          height: parcel.heightCm,

          total_weight: parcel.totalWeightGram,

          is_fragile: items.some(
            (item) => item.variant.isFragile,
          ),

          is_liquid: items.some(
            (item) => item.variant.isLiquid,
          ),

          total_value: subtotal.toNumber(),

          pre_paid_amount: 0,

          total_value_currency: 'IRR',

          box_type_id: dto.boxTypeId || 0,
        },
      },
    ],

    value_added_service: {
      request_label: false,
      request_packaging: dto.packaging ?? false,
      request_sms_notification:
        dto.smsNotification ?? false,
    },
  };
}

  private buildShipmentPayload(order: any) {
  const quote = order.postexQuote;

  return {
    collection_type: 'pick_up',

    custom_batch_no: `feloral-${order.id}`,

    custom_channel: 'api',

    parcels: [
  {
    courier: {
  name: quote.courierCode, 
  service_type: quote.serviceType,
  payment_type: 'SENDER',
},

        from: {
          contact: {
            first_name: 'Feloral',
            last_name: 'Store',
            mobile_no: quote.origin.senderMobile,
telephone_no: quote.origin.senderMobile,
          },

          location: {
            post_code:
              quote.origin.postalCode,

            country: 'IR',

            city_id:
              quote.origin.postexCityId,

            city_name:
              quote.origin.city,

            address:
              quote.origin.addressLine,
          },
        },

        to: {
          contact: {
            first_name:
              order.shippingReceiverName,

            last_name: 'Customer',
mobile_no: order.shippingReceiverMobile,
telephone_no: order.shippingReceiverMobile,
          },

          location: {
            post_code:
              order.shippingPostalCode,

            country: 'IR',

            city_id:
              order.postexCityId,

            city_name:
              order.shippingCity,

            address:
              order.shippingAddressLine,
          },
        },


        parcel_items: order.items.map((item) => ({
  description: item.productName,
  product_id: item.productId,
  properties: {},
  quantity: item.quantity,
  sku: item.sku,
  price: Number(item.price),
  weight: item.variant?.weightGram ?? 0,
})),


        parcel_properties: {
          length:
            quote.lengthCm,

          width:
            quote.widthCm,

          height:
            quote.heightCm,

          total_weight:
            quote.totalWeightGram,

          is_fragile:
            false,

          is_liquid:
            false,

          total_value:
            Number(order.subtotal),

          pre_paid_amount:
            0,

          total_value_currency:
            'IRR',

          box_type_id:
            quote.boxTypeId || 0,
        },


        custom_order_no: String(order.id),

        ready_to_accept:
          true,


        added_service: {
          request_label: false,
          request_packaging:
            quote.packaging ?? false,

          request_sms_notification:
            quote.smsNotification ?? false,
        },
      },
    ],
  };
}

  private originPayload(origin: any) {
    return {
      cityId: origin.postexCityId,
      province: origin.province,
      city: origin.city,
      address: origin.addressLine,
      postalCode: origin.postalCode,
      plaque: origin.plaque,
      unit: origin.unit,
      senderName: origin.senderName,
      senderMobile: origin.senderMobile,
      title: origin.title,
    };
  }

  private destinationPayload(address: any) {
    return {
      cityId: address.postexCityId,
      province: address.province,
      city: address.city,
      address: address.addressLine,
      postalCode: address.postalCode,
      plaque: address.plaque,
      unit: address.unit,
      receiverName: address.receiverName,
      receiverMobile: address.receiverMobile,
    };
  }

  private orderStatusFromShipping(
    current: OrderStatus,
    status: ShippingStatusValue,
  ) {
    if (status === SHIPPING_STATUS.delivered) return OrderStatus.delivered;
    if (
      status === SHIPPING_STATUS.shipped &&
      (current === OrderStatus.paid || current === OrderStatus.processing)
    ) {
      return OrderStatus.shipped;
    }
    if (status === SHIPPING_STATUS.preparing && current === OrderStatus.paid) {
      return OrderStatus.processing;
    }
    return current;
  }

  private safeQuote(row: any) {
    return {
      id: row.id,
      serviceCode: row.serviceCode,
      courierCode: row.courierCode,
      serviceName: row.serviceName,
      serviceType: row.serviceType,
      providerPrice: row.providerPrice,
      internalExtraCost: row.internalExtraCost,
      customerPrice: row.customerPrice,
      estimatedDelivery: row.estimatedDelivery,
      boxTypeId: row.boxTypeId,
      packageCode: row.packageCode,
      packageTitle: row.packageTitle,
      paymentType: row.paymentType,
      pickupType: row.pickupType,
      expiresAt: row.expiresAt,
    };
  }

  private extractCollection(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    const object = value as Record<string, unknown>;
    for (const key of ['items', 'data', 'results', 'cities', 'boxTypes']) {
      const selected = object[key];
      if (Array.isArray(selected)) return selected;
      if (selected && typeof selected === 'object') {
        const nested = this.extractCollection(selected);
        if (nested.length > 0) return nested;
      }
    }
    return [];
  }

  private quoteTtlMinutes() {
    const configured = Number(
      this.configService.get('POSTEX_QUOTE_TTL_MINUTES'),
    );
    return Number.isInteger(configured) && configured >= 2 && configured <= 60
      ? configured
      : 10;
  }

  private internalExtraCost() {
    const configured = Number(this.configService.get('POSTEX_MARKUP_AMOUNT'));
    return Number.isFinite(configured) && configured >= 0
      ? new Prisma.Decimal(Math.round(configured))
      : new Prisma.Decimal(0);
  }

  private markupPercent() {
    const configured = Number(this.configService.get('POSTEX_MARKUP_PERCENT'));
    return Number.isFinite(configured) && configured >= 0 && configured <= 100
      ? configured
      : 0;
  }

  private freeShippingAbove() {
    const configured = Number(
      this.configService.get('POSTEX_FREE_SHIPPING_ABOVE'),
    );
    return Number.isFinite(configured) && configured > 0
      ? new Prisma.Decimal(configured)
      : undefined;
  }

  private asJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }
}
