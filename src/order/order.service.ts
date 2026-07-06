import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CouponType,
  OrderStatus,
  Prisma,
  ShippingProvider,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';

import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto';
import { htmlToPdfBuffer } from './invoice-pdf.util';

type AdminOrderQuery = {
  page?: string;
  limit?: string;
  status?: string;
  search?: string;
};

type CheckoutAddressSnapshot = {
  addressId: number | null;
  postexCityId: number | null;
  shippingReceiverName: string | null;
  shippingReceiverMobile: string | null;
  shippingProvince: string | null;
  shippingCity: string | null;
  shippingAddressLine: string | null;
  shippingPostalCode: string | null;
  shippingPlaque: string | null;
  shippingUnit: string | null;
};

type PostexSelectedQuote = {
  provider: string;
  courierCode: string | null;
  courierName: string | null;
  serviceType: string | null;
  title: string | null;
  estimatedDelivery: string | null;
  baseCostIrr: number;
  extraServiceCostIrr: number;
  baseCostToman: number;
  extraServiceCostToman: number;
  cost: number;
  internalExtraCost: number;
  currency: string;
  raw: unknown;
};

type PostexQuoteResponseForCheckout = {
  data?: PostexSelectedQuote[];
  meta?: {
    selectedPackage?: {
      boxTypeId: number;
      code: string;
      title: string;
      kind: string;
      packageLengthCm: number;
      packageWidthCm: number;
      packageHeightCm: number;
      shipmentLengthCm: number;
      shipmentWidthCm: number;
      shipmentHeightCm: number;
    };
    packageInfo?: unknown;
    [key: string]: unknown;
  };
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingService: ShippingService,
  ) {}

  private toNumber(value: unknown, fallback: number): number {
    const number = Number(value);
    return Number.isNaN(number) || number < 0 ? fallback : number;
  }

  private normalizeCouponCode(code?: string | null) {
    if (!code) return null;

    const normalized = code.trim().toUpperCase();

    return normalized.length > 0 ? normalized : null;
  }

  private calculateShippingCost(provider: ShippingProvider, subtotal: number) {
    const shippingCosts: Record<ShippingProvider, number> = {
      post: 75000,
      tipax: 120000,
      alopeyk: 85000,
      snapp: 90000,
      tapsi: 90000,
      courier: 70000,
      free: 0,
      other: 0,
    };

    if (provider === ShippingProvider.free) {
      return 0;
    }

    return shippingCosts[provider] ?? 0;
  }

  private isCustomerSelectableShippingProvider(provider: ShippingProvider) {
    const allowedProviders: ShippingProvider[] = [
      ShippingProvider.post,
      ShippingProvider.tipax,
      ShippingProvider.alopeyk,
      ShippingProvider.snapp,
      ShippingProvider.tapsi,
      ShippingProvider.courier,
    ];

    return allowedProviders.includes(provider);
  }

  private getShippingProviderDescription(provider: ShippingProvider) {
    const descriptions: Record<ShippingProvider, string> = {
      post: 'ارسال از طریق پستکس',
      tipax: 'ارسال سریع‌تر برای شهرهای تحت پوشش تیپاکس',
      alopeyk: 'ارسال فوری درون‌شهری با الوپیک',
      snapp: 'ارسال فوری درون‌شهری با اسنپ',
      tapsi: 'ارسال فوری درون‌شهری با تپسی',
      courier: 'ارسال با پیک اختصاصی فروشگاه',
      free: 'ارسال رایگان',
      other: 'روش ارسال متفرقه',
    };

    return descriptions[provider] || null;
  }

  private getFinalPrice(
    price: Prisma.Decimal,
    salePrice?: Prisma.Decimal | null,
  ) {
    const originalPrice = Number(price);
    const discountPrice = salePrice ? Number(salePrice) : null;

    const finalPrice =
      discountPrice && discountPrice > 0 && discountPrice < originalPrice
        ? discountPrice
        : originalPrice;

    const discountAmount = originalPrice - finalPrice;

    const discountPercent =
      discountAmount > 0
        ? Math.round((discountAmount / originalPrice) * 100)
        : 0;

    return {
      originalPrice,
      salePrice: discountPrice,
      finalPrice,
      discountAmount,
      discountPercent,
      hasDiscount: discountPercent > 0,
    };
  }

  private calculateCouponDiscount(coupon: any, subtotal: number) {
    let discountAmount = 0;

    if (coupon.type === CouponType.percent) {
      discountAmount = Math.floor((subtotal * Number(coupon.value)) / 100);

      if (
        coupon.maxDiscount !== null &&
        coupon.maxDiscount !== undefined &&
        discountAmount > Number(coupon.maxDiscount)
      ) {
        discountAmount = Number(coupon.maxDiscount);
      }
    }

    if (coupon.type === CouponType.fixed) {
      discountAmount = Number(coupon.value);
    }

    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    if (discountAmount < 0) {
      discountAmount = 0;
    }

    return discountAmount;
  }

  private async validateCouponForCheckout(
    tx: Prisma.TransactionClient,
    userId: number,
    couponCode: string,
    subtotal: number,
  ) {
    const coupon = await tx.coupon.findUnique({
      where: {
        code: couponCode,
      },
    });

    if (!coupon) {
      throw new NotFoundException('کد تخفیف پیدا نشد');
    }

    const now = new Date();

    if (!coupon.isActive) {
      throw new BadRequestException('این کد تخفیف غیرفعال است');
    }

    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException(
        'زمان استفاده از این کد تخفیف هنوز شروع نشده است',
      );
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException('این کد تخفیف منقضی شده است');
    }

    if (
      coupon.usageLimit !== null &&
      coupon.usageLimit !== undefined &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      throw new BadRequestException('ظرفیت استفاده از این کد تخفیف تمام شده است');
    }

    if (subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `حداقل مبلغ سفارش برای این کد تخفیف ${Number(
          coupon.minOrderAmount,
        )} تومان است`,
      );
    }

    if (
      coupon.usageLimitPerUser !== null &&
      coupon.usageLimitPerUser !== undefined
    ) {
      const userUsageCount = await tx.couponUsage.count({
        where: {
          couponId: coupon.id,
          userId,
        },
      });

      if (userUsageCount >= coupon.usageLimitPerUser) {
        throw new BadRequestException(
          'شما قبلاً از این کد تخفیف به تعداد مجاز استفاده کرده‌اید',
        );
      }
    }

    const discountAmount = this.calculateCouponDiscount(coupon, subtotal);

    return {
      coupon,
      discountAmount,
    };
  }

  private isStockReturnedStatus(status: OrderStatus) {
    const returnedStatuses: OrderStatus[] = [
      OrderStatus.canceled,
      OrderStatus.refunded,
      OrderStatus.failed,
    ];

    return returnedStatuses.includes(status);
  }

  private getOrderInclude() {
    return {
      user: {
        select: {
          id: true,
          fullName: true,
          mobile: true,
          email: true,
          role: true,
        },
      },
      address: true,
      coupon: true,
      couponUsage: true,
      items: {
        orderBy: {
          id: 'asc' as const,
        },
        include: {
          product: true,
          variant: true,
        },
      },
    };
  }

  private toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private async getSelectedPostexQuoteForCheckout(
    userId: number,
    toCityCode: number,
    courierCode: string,
    serviceType: string,
  ) {
    const quoteResponse =
      (await this.shippingService.getCartShippingQuote(userId, {
        toCityCode,
      })) as PostexQuoteResponseForCheckout;

    const quotes = quoteResponse.data || [];

    const selectedQuote = quotes.find((item) => {
      return (
        item.courierCode === courierCode &&
        item.serviceType === serviceType
      );
    });

    if (!selectedQuote) {
      throw new BadRequestException(
        'روش ارسال انتخاب‌شده در قیمت‌های فعلی پستکس وجود ندارد',
      );
    }

    if (selectedQuote.cost < 0) {
      throw new BadRequestException('هزینه ارسال پستکس نامعتبر است');
    }

    return {
      selectedQuote,
      quoteResponse,
      selectedPackage: quoteResponse.meta?.selectedPackage || null,
    };
  }

  private getPostexServiceTitle(selectedQuote: PostexSelectedQuote) {
    return selectedQuote.title || selectedQuote.serviceType || 'پستکس';
  }

  private formatOrder(order: any) {
    const items =
      order.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantTitle: item.variantTitle,
        sku: item.sku,
        price: Number(item.price),
        quantity: item.quantity,
        total: Number(item.total),

        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              englishName: item.product.englishName,
              slug: item.product.slug,
              shortDesc: item.product.shortDesc,
            }
          : null,

        variant: item.variant
          ? {
              id: item.variant.id,
              title: item.variant.title,
              sku: item.variant.sku,
              volume: item.variant.volume,
              barcode: item.variant.barcode,
              stock: item.variant.stock,
              isActive: item.variant.isActive,
            }
          : null,

        createdAt: item.createdAt,
      })) || [];

    const total = Number(order.total ?? 0);
    const subtotal =
      Number(order.subtotal ?? 0) > 0 ? Number(order.subtotal) : total;
    const discountTotal = Number(order.discountTotal ?? 0);
    const payableTotal =
      Number(order.payableTotal ?? 0) > 0
        ? Number(order.payableTotal)
        : total;

    return {
      id: order.id,
      userId: order.userId,

      user: order.user
        ? {
            id: order.user.id,
            fullName: order.user.fullName,
            mobile: order.user.mobile,
            email: order.user.email,
            role: order.user.role,
          }
        : null,

      addressId: order.addressId,
      status: order.status,

      subtotal,
      discountTotal,
      payableTotal,
      total,

      coupon: order.coupon
        ? {
            id: order.coupon.id,
            code: order.coupon.code,
            title: order.coupon.title,
            type: order.coupon.type,
            value: Number(order.coupon.value),
          }
        : null,

      couponCode: order.couponCode,
      authority: order.authority,

      shipping: {
        receiverName: order.shippingReceiverName,
        receiverMobile: order.shippingReceiverMobile,
        province: order.shippingProvince,
        city: order.shippingCity,
        postexCityId: order.postexCityId,
        addressLine: order.shippingAddressLine,
        postalCode: order.shippingPostalCode,
        plaque: order.shippingPlaque,
        unit: order.shippingUnit,

        provider: order.shippingProvider,
        status: order.shippingStatus,
        cost: Number(order.shippingCost ?? 0),

        postex: {
          boxTypeId: order.postexBoxTypeId,
          packageTitle: order.postexPackageTitle,
          packageCode: order.postexPackageCode,
          courierCode: order.postexCourierCode,
          serviceType: order.postexServiceType,
          serviceName: order.postexServiceName,
          estimatedDelivery: order.postexEstimatedDelivery,
          internalExtraCost: Number(order.postexInternalExtraCost ?? 0),
          quoteSnapshot: order.postexQuoteSnapshot,
          shipmentSnapshot: order.postexShipmentSnapshot,
          shipmentCreatedAt: order.shipmentCreatedAt,
          shipmentError: order.shipmentError,
        },

        trackingCode: order.trackingCode,
        trackingUrl: order.trackingUrl,
        providerOrderId: order.providerOrderId,

        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        note: order.shippingNote,
      },

      items,

      summary: {
        itemCount: items.length,
        totalQuantity: items.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        ),
        subtotal,
        discountTotal,
        shippingCost: Number(order.shippingCost ?? 0),
        payableTotal,
        total,
      },

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private formatInvoice(order: any) {
    const items =
      order.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,

        productName: item.productName,
        variantTitle: item.variantTitle,
        sku: item.sku,

        unitPrice: Number(item.price),
        quantity: item.quantity,
        lineTotal: Number(item.total),

        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              englishName: item.product.englishName,
              slug: item.product.slug,
            }
          : null,

        variant: item.variant
          ? {
              id: item.variant.id,
              title: item.variant.title,
              sku: item.variant.sku,
              volume: item.variant.volume,
              barcode: item.variant.barcode,
            }
          : null,
      })) || [];

    const calculatedSubtotal = items.reduce(
      (sum: number, item: any) => sum + item.lineTotal,
      0,
    );

    const subtotal =
      Number(order.subtotal ?? 0) > 0
        ? Number(order.subtotal)
        : calculatedSubtotal;

    const discountTotal = Number(order.discountTotal ?? 0);

    const payableTotal =
      Number(order.payableTotal ?? 0) > 0
        ? Number(order.payableTotal)
        : Number(order.total ?? 0);

    const total =
      Number(order.total ?? 0) > 0 ? Number(order.total) : payableTotal;

    const invoiceNumber = `FEL-${String(order.id).padStart(6, '0')}`;

    const fullAddress = [
      order.shippingProvince,
      order.shippingCity,
      order.shippingAddressLine,
      order.shippingAddressLine?.includes('پلاک')
        ? null
        : order.shippingPlaque
          ? `پلاک ${order.shippingPlaque}`
          : null,
      order.shippingAddressLine?.includes('واحد')
        ? null
        : order.shippingUnit
          ? `واحد ${order.shippingUnit}`
          : null,
    ]
      .filter(Boolean)
      .join('، ');

    return {
      invoice: {
        invoiceNumber,
        orderId: order.id,
        issuedAt: new Date().toISOString(),
        orderCreatedAt: order.createdAt,
        orderUpdatedAt: order.updatedAt,
      },

      customer: order.user
        ? {
            id: order.user.id,
            fullName: order.user.fullName,
            mobile: order.user.mobile,
            email: order.user.email,
          }
        : null,

      order: {
        id: order.id,
        status: order.status,
        isPaid: order.status === OrderStatus.paid,
        authority: order.authority,
      },

      shipping: {
        receiverName: order.shippingReceiverName,
        receiverMobile: order.shippingReceiverMobile,
        province: order.shippingProvince,
        city: order.shippingCity,
        postexCityId: order.postexCityId,
        addressLine: order.shippingAddressLine,
        postalCode: order.shippingPostalCode,
        plaque: order.shippingPlaque,
        unit: order.shippingUnit,
        fullAddress,

        provider: order.shippingProvider,
        status: order.shippingStatus,
        cost: Number(order.shippingCost ?? 0),

        postex: {
          boxTypeId: order.postexBoxTypeId,
          packageTitle: order.postexPackageTitle,
          packageCode: order.postexPackageCode,
          courierCode: order.postexCourierCode,
          serviceType: order.postexServiceType,
          serviceName: order.postexServiceName,
          estimatedDelivery: order.postexEstimatedDelivery,
          internalExtraCost: Number(order.postexInternalExtraCost ?? 0),
          shipmentCreatedAt: order.shipmentCreatedAt,
          shipmentError: order.shipmentError,
        },

        trackingCode: order.trackingCode,
        trackingUrl: order.trackingUrl,
        providerOrderId: order.providerOrderId,

        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        note: order.shippingNote,
      },

      coupon: order.coupon
        ? {
            id: order.coupon.id,
            code: order.coupon.code,
            title: order.coupon.title,
            type: order.coupon.type,
            value: Number(order.coupon.value),
          }
        : null,

      couponCode: order.couponCode,

      items,

      summary: {
        itemCount: items.length,
        totalQuantity: items.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        ),
        subtotal,
        discountTotal,
        shippingCost: Number(order.shippingCost ?? 0),
        payableTotal,
        total,
      },

      texts: {
        title: 'فاکتور سفارش',
        paymentStatus:
          order.status === OrderStatus.paid
            ? 'پرداخت‌شده'
            : 'در انتظار پرداخت',
        discountText:
          discountTotal > 0
            ? `تخفیف اعمال‌شده: ${discountTotal.toLocaleString('fa-IR')} تومان`
            : 'بدون تخفیف',
        finalAmountText: `${payableTotal.toLocaleString('fa-IR')} تومان`,
      },
    };
  }

  private toPersianDigits(value: unknown) {
    const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    return String(value ?? '').replace(/\d/g, (digit) => digits[Number(digit)]);
  }

  private formatMoney(value: unknown) {
    return `${Number(value ?? 0).toLocaleString('fa-IR')} تومان`;
  }

  private formatDate(value: unknown) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value as string | Date));
  }

  private escapeHtml(value: unknown) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getShippingProviderLabel(provider?: string | null) {
    const labels: Record<string, string> = {
      post: 'پستکس',
      tipax: 'تیپاکس',
      alopeyk: 'الوپیک',
      snapp: 'اسنپ',
      tapsi: 'تپسی',
      courier: 'پیک فروشگاه',
      free: 'ارسال رایگان',
      other: 'سایر',
    };

    if (!provider) return '-';

    return labels[provider] || provider;
  }

  private getShippingStatusLabel(status?: string | null) {
    const labels: Record<string, string> = {
      not_shipped: 'ارسال نشده',
      preparing: 'در حال آماده‌سازی',
      shipped: 'ارسال شده',
      delivered: 'تحویل داده شده',
      returned: 'مرجوع شده',
      canceled: 'لغو شده',
    };

    if (!status) return '-';

    return labels[status] || status;
  }

  getShippingMethods(subtotal?: string) {
    const normalizedSubtotal = this.toNumber(subtotal, 0);

    const providers: ShippingProvider[] = [
      ShippingProvider.post,
      ShippingProvider.tipax,
      ShippingProvider.alopeyk,
      ShippingProvider.snapp,
      ShippingProvider.tapsi,
      ShippingProvider.courier,
    ];

    const data = providers.map((provider) => {
      const cost = this.calculateShippingCost(provider, normalizedSubtotal);

      return {
        provider,
        title: this.getShippingProviderLabel(provider),
        description: this.getShippingProviderDescription(provider),
        cost,
        costText: this.formatMoney(cost),
        isFree: cost === 0,
        isAvailable: true,
      };
    });

    return {
      data,
      meta: {
        subtotal: normalizedSubtotal,
        defaultProvider: ShippingProvider.post,
        note: 'برای قیمت واقعی پستکس از /shipping/cart-quote استفاده شود',
      },
    };
  }

  private buildInvoicePrintHtml(invoiceData: any) {
    const invoice = invoiceData.invoice;
    const customer = invoiceData.customer;
    const order = invoiceData.order;
    const shipping = invoiceData.shipping;
    const summary = invoiceData.summary;
    const items = invoiceData.items || [];
    const coupon = invoiceData.coupon;

    const shippingProviderLabel =
      shipping?.postex?.serviceName ||
      this.getShippingProviderLabel(shipping?.provider);

    const shippingStatusLabel = this.getShippingStatusLabel(shipping?.status);

    const en = (value: unknown) =>
      `<span class="en">${this.escapeHtml(value)}</span>`;

    const faDigits = (value: unknown) =>
      this.toPersianDigits(this.escapeHtml(value));

    const mixed = (value: unknown) =>
      this.toPersianDigits(this.escapeHtml(value)).replace(
        /([A-Za-z@._+\-:/]+)/g,
        '<span class="en">$1</span>',
      );

    const itemRows = items
      .map(
        (item: any, index: number) => `
        <tr>
          <td>${faDigits(index + 1)}</td>
          <td>
            <strong>${mixed(item.productName)}</strong>
            <small>${mixed(item.variantTitle)} | <span class="en">SKU:</span> ${mixed(item.sku)}</small>
          </td>
          <td>${faDigits(item.quantity)}</td>
          <td>${this.formatMoney(item.unitPrice)}</td>
          <td>${this.formatMoney(item.lineTotal)}</td>
        </tr>
      `,
      )
      .join('');

    return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فاکتور ${this.toPersianDigits(this.escapeHtml(invoice.invoiceNumber))}</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #f3f4f6;
      color: #111827;
      font-family: Tahoma, Arial, sans-serif;
      line-height: 1.9;
      font-size: 15px;
    }

    .invoice-page {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
    }

    .en {
      font-family: "Times New Roman", Georgia, serif !important;
      direction: ltr;
      unicode-bidi: embed;
      font-weight: 700;
    }

    .top {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }

    .brand h1 {
      margin: 0;
      font-size: 34px;
      color: #8b4b5f;
      font-weight: 800;
    }

    .brand p {
      margin: 4px 0 0;
      color: #6b7280;
      font-size: 15px;
    }

    .invoice-meta {
      text-align: left;
      font-size: 14px;
      color: #374151;
    }

    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      font-weight: bold;
      font-size: 13px;
      margin-top: 8px;
    }

    .paid {
      background: #dcfce7;
      color: #166534;
    }

    .pending {
      background: #fef3c7;
      color: #92400e;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
      align-items: start;
    }

    .card {
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #ffffff;
      overflow: hidden;
    }

    .card h2 {
      margin: 0;
      padding: 11px 14px;
      background: #8b4b5f;
      color: #ffffff;
      font-size: 15px;
      font-weight: bold;
      text-align: center;
    }

    .line {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
      color: #111827;
      font-size: 15px;
    }

    .line:last-child {
      border-bottom: none;
    }

    .label {
      color: #6b7280;
      white-space: nowrap;
    }

    .line strong {
      color: #111827;
      text-align: left;
      word-break: break-word;
    }

    .shipping-detail-card {
      grid-column: 1 / -1;
    }

    .shipping-detail-card .line {
      display: grid;
      grid-template-columns: 180px 1fr;
      align-items: center;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      overflow: hidden;
      border-radius: 14px;
    }

    th {
      background: #8b4b5f;
      color: #ffffff;
      padding: 11px 10px;
      font-size: 15px;
      text-align: center;
      font-weight: bold;
    }

    td {
      padding: 11px 10px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 15px;
      vertical-align: top;
      text-align: center;
    }

    th:nth-child(2),
    td:nth-child(2) {
      text-align: right;
    }

    td small {
      display: block;
      color: #6b7280;
      margin-top: 4px;
      direction: ltr;
      text-align: right;
      font-size: 13px;
    }

    .summary {
      width: 100%;
      max-width: 420px;
      margin: 24px auto 0;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      overflow: hidden;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 11px 14px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 15px;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .final {
      background: #8b4b5f;
      color: #ffffff;
      font-weight: bold;
      font-size: 16px;
    }

    .footer {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 13px;
      text-align: center;
    }

    .tracking-link {
      color: #8b4b5f;
      text-decoration: none;
      font-weight: bold;
    }

    .actions {
      max-width: 900px;
      margin: 18px auto;
      display: flex;
      justify-content: center;
      gap: 10px;
    }

    button {
      border: none;
      background: #8b4b5f;
      color: white;
      padding: 10px 18px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
    }

    button.secondary {
      background: #374151;
    }

    @media print {
      body {
        background: #fff;
        padding: 0;
        font-size: 13px;
      }

      .invoice-page {
        width: 100%;
        max-width: none;
        margin: 0;
        box-shadow: none;
        border-radius: 0;
        padding: 12px;
      }

      .actions {
        display: none;
      }
    }

    @media (max-width: 700px) {
      body {
        padding: 10px;
      }

      .invoice-page {
        padding: 16px;
      }

      .top,
      .grid {
        grid-template-columns: 1fr;
        display: grid;
      }

      .invoice-meta {
        text-align: right;
      }

      .shipping-detail-card .line {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>

<body>
  <div class="actions">
    <button onclick="window.print()">چاپ فاکتور</button>
    <button class="secondary" onclick="window.close()">بستن</button>
  </div>

  <main class="invoice-page">
    <section class="top">
      <div class="brand">
        <h1>Feloral</h1>
        <p>فاکتور رسمی خرید از فروشگاه فلورال</p>
      </div>

      <div class="invoice-meta">
        <div><strong>شماره فاکتور:</strong> ${mixed(invoice.invoiceNumber)}</div>
        <div><strong>شماره سفارش:</strong> ${faDigits(order.id)}</div>
        <div><strong>تاریخ سفارش:</strong> ${this.formatDate(invoice.orderCreatedAt)}</div>
        <div><strong>تاریخ صدور:</strong> ${this.formatDate(invoice.issuedAt)}</div>
        <span class="badge ${order.isPaid ? 'paid' : 'pending'}">
          ${this.escapeHtml(invoiceData.texts.paymentStatus)}
        </span>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <h2>مشخصات مشتری</h2>

        <div class="line">
          <span class="label">نام</span>
          <strong>${mixed(customer?.fullName || '-')}</strong>
        </div>

        <div class="line">
          <span class="label">موبایل</span>
          <strong>${mixed(customer?.mobile || '-')}</strong>
        </div>

        <div class="line">
          <span class="label">ایمیل</span>
          <strong>${en(customer?.email || '-')}</strong>
        </div>
      </div>

      <div class="card">
        <h2>اطلاعات ارسال</h2>

        <div class="line">
          <span class="label">گیرنده</span>
          <strong>${mixed(shipping?.receiverName || '-')}</strong>
        </div>

        <div class="line">
          <span class="label">موبایل گیرنده</span>
          <strong>${mixed(shipping?.receiverMobile || '-')}</strong>
        </div>

        <div class="line">
          <span class="label">کد پستی</span>
          <strong>${faDigits(shipping?.postalCode || '-')}</strong>
        </div>

        <div class="line">
          <span class="label">آدرس</span>
          <strong>${mixed(shipping?.fullAddress || '-')}</strong>
        </div>
      </div>

      <div class="card shipping-detail-card">
        <h2>جزئیات ارسال و رهگیری</h2>

        <div class="line">
          <span class="label">روش ارسال</span>
          <strong>${this.escapeHtml(shippingProviderLabel)}</strong>
        </div>

        <div class="line">
          <span class="label">بسته پستکس</span>
          <strong>${mixed(shipping?.postex?.packageTitle || '-')}</strong>
        </div>

        <div class="line">
          <span class="label">زمان تقریبی تحویل</span>
          <strong>${mixed(shipping?.postex?.estimatedDelivery || '-')}</strong>
        </div>

        <div class="line">
          <span class="label">وضعیت ارسال</span>
          <strong>${this.escapeHtml(shippingStatusLabel)}</strong>
        </div>

        <div class="line">
          <span class="label">هزینه ارسال</span>
          <strong>${this.formatMoney(shipping?.cost || 0)}</strong>
        </div>

        <div class="line">
          <span class="label">کد رهگیری</span>
          <strong>${mixed(shipping?.trackingCode || '-')}</strong>
        </div>

        ${
          shipping?.trackingUrl
            ? `
              <div class="line">
                <span class="label">لینک رهگیری</span>
                <strong>
                  <a class="tracking-link" href="${this.escapeHtml(
                    shipping.trackingUrl,
                  )}" target="_blank">
                    مشاهده وضعیت ارسال
                  </a>
                </strong>
              </div>
            `
            : ''
        }

        ${
          shipping?.providerOrderId
            ? `
              <div class="line">
                <span class="label">شناسه شرکت ارسال</span>
                <strong>${mixed(shipping.providerOrderId)}</strong>
              </div>
            `
            : ''
        }

        ${
          shipping?.note
            ? `
              <div class="line">
                <span class="label">توضیحات ارسال</span>
                <strong>${mixed(shipping.note)}</strong>
              </div>
            `
            : ''
        }
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>محصول</th>
          <th>تعداد</th>
          <th>قیمت واحد</th>
          <th>جمع</th>
        </tr>
      </thead>

      <tbody>
        ${
          itemRows ||
          '<tr><td colspan="5">آیتمی برای این سفارش ثبت نشده است.</td></tr>'
        }
      </tbody>
    </table>

    <section class="summary">
      <div class="summary-row">
        <span>جمع کالاها</span>
        <strong>${this.formatMoney(summary.subtotal)}</strong>
      </div>

      <div class="summary-row">
        <span>تخفیف</span>
        <strong>${this.formatMoney(summary.discountTotal)}</strong>
      </div>

      <div class="summary-row">
        <span>هزینه ارسال</span>
        <strong>${this.formatMoney(summary.shippingCost)}</strong>
      </div>

      ${
        coupon
          ? `
            <div class="summary-row">
              <span>کد تخفیف</span>
              <strong>${en(coupon.code)}</strong>
            </div>
          `
          : ''
      }

      <div class="summary-row final">
        <span>مبلغ نهایی</span>
        <strong>${this.formatMoney(summary.payableTotal)}</strong>
      </div>
    </section>

    <section class="footer">
      این فاکتور به‌صورت سیستمی توسط <span class="en">Feloral</span> صادر شده است.
      <br />
      شناسه پرداخت: ${mixed(order.authority || '-')}
    </section>
  </main>
</body>
</html>`;
  }

  async checkout(userId: number, dto: CheckoutDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: {
          userId,
        },
        include: {
          items: {
            orderBy: {
              id: 'asc',
            },
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

      if (!cart || !cart.items.length) {
        throw new BadRequestException('سبد خرید خالی است');
      }

      let addressSnapshot: CheckoutAddressSnapshot = {
        addressId: null,
        postexCityId: dto.postexCityId || null,
        shippingReceiverName: dto.shippingReceiverName?.trim() || null,
        shippingReceiverMobile: dto.shippingReceiverMobile?.trim() || null,
        shippingProvince: dto.shippingProvince?.trim() || null,
        shippingCity: dto.shippingCity?.trim() || null,
        shippingAddressLine: dto.shippingAddressLine?.trim() || null,
        shippingPostalCode: dto.shippingPostalCode?.trim() || null,
        shippingPlaque: dto.shippingPlaque?.trim() || null,
        shippingUnit: dto.shippingUnit?.trim() || null,
      };

      if (dto.addressId) {
        const address = await tx.address.findFirst({
          where: {
            id: dto.addressId,
            userId,
            isActive: true,
          },
        });

        if (!address) {
          throw new NotFoundException('آدرس انتخاب‌شده پیدا نشد');
        }

        addressSnapshot = {
          addressId: address.id,
          postexCityId: address.postexCityId || null,
          shippingReceiverName: address.receiverName,
          shippingReceiverMobile: address.receiverMobile,
          shippingProvince: address.province,
          shippingCity: address.city,
          shippingAddressLine: address.addressLine,
          shippingPostalCode: address.postalCode,
          shippingPlaque: address.plaque,
          shippingUnit: address.unit,
        };
      }

      const orderItemsData: Prisma.OrderItemCreateWithoutOrderInput[] = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const variant = cartItem.variant;
        const product = variant.product;

        if (!product || !product.isActive) {
          throw new BadRequestException(
            `محصول ${product?.name || ''} فعال نیست`,
          );
        }

        if (!variant.isActive) {
          throw new BadRequestException(`تنوع ${variant.title} فعال نیست`);
        }

        if (variant.stock < cartItem.quantity) {
          throw new BadRequestException(
            `موجودی محصول ${product.name} کافی نیست. موجودی فعلی: ${variant.stock}`,
          );
        }

        const priceInfo = this.getFinalPrice(variant.price, variant.salePrice);
        const lineTotal = priceInfo.finalPrice * cartItem.quantity;
        subtotal += lineTotal;

        orderItemsData.push({
          product: {
            connect: {
              id: product.id,
            },
          },
          variant: {
            connect: {
              id: variant.id,
            },
          },
          productName: product.name,
          variantTitle: variant.title,
          sku: variant.sku,
          price: new Prisma.Decimal(priceInfo.finalPrice),
          quantity: cartItem.quantity,
          total: new Prisma.Decimal(lineTotal),
        });
      }

      const normalizedCouponCode = this.normalizeCouponCode(dto.couponCode);

      let couponConnect: { id: number } | undefined;
      let couponCodeSnapshot: string | null = null;
      let discountTotal = 0;

      if (normalizedCouponCode) {
        const couponResult = await this.validateCouponForCheckout(
          tx,
          userId,
          normalizedCouponCode,
          subtotal,
        );

        couponConnect = {
          id: couponResult.coupon.id,
        };

        couponCodeSnapshot = couponResult.coupon.code;
        discountTotal = couponResult.discountAmount;
      }

      if (!addressSnapshot.postexCityId) {
        throw new BadRequestException(
          'کد شهر پستکس برای آدرس انتخاب‌شده ثبت نشده است',
        );
      }

      const selectedShippingProvider = ShippingProvider.post;

      if (!this.isCustomerSelectableShippingProvider(selectedShippingProvider)) {
        throw new BadRequestException(
          'روش ارسال انتخاب‌شده برای ثبت سفارش معتبر نیست',
        );
      }

      const postexCheckoutQuote =
        await this.getSelectedPostexQuoteForCheckout(
          userId,
          addressSnapshot.postexCityId,
          dto.courierCode,
          dto.serviceType,
        );

      const selectedPostexQuote = postexCheckoutQuote.selectedQuote;
      const selectedPostexPackage = postexCheckoutQuote.selectedPackage;

      const shippingCost = selectedPostexQuote.cost;
      const postexInternalExtraCost =
        selectedPostexQuote.internalExtraCost || 0;

      const payableTotal = subtotal - discountTotal + shippingCost;

      const order = await tx.order.create({
        data: {
          user: {
            connect: {
              id: userId,
            },
          },

          address: addressSnapshot.addressId
            ? {
                connect: {
                  id: addressSnapshot.addressId,
                },
              }
            : undefined,

          status: OrderStatus.pending,

          subtotal: new Prisma.Decimal(subtotal),
          discountTotal: new Prisma.Decimal(discountTotal),
          payableTotal: new Prisma.Decimal(payableTotal),
          total: new Prisma.Decimal(payableTotal),

          shippingProvider: selectedShippingProvider,
          shippingCost: new Prisma.Decimal(shippingCost),

          postexCityId: addressSnapshot.postexCityId,
          postexBoxTypeId: selectedPostexPackage?.boxTypeId || null,
          postexPackageTitle: selectedPostexPackage?.title || null,
          postexPackageCode: selectedPostexPackage?.code || null,

          postexCourierCode: selectedPostexQuote.courierCode,
          postexServiceType: selectedPostexQuote.serviceType,
          postexServiceName: this.getPostexServiceTitle(selectedPostexQuote),
          postexEstimatedDelivery: selectedPostexQuote.estimatedDelivery,
          postexInternalExtraCost: new Prisma.Decimal(
            postexInternalExtraCost,
          ),

          postexQuoteSnapshot: this.toPrismaJson(
            postexCheckoutQuote.quoteResponse,
          ),

          coupon: couponConnect
            ? {
                connect: couponConnect,
              }
            : undefined,
          couponCode: couponCodeSnapshot,

          shippingReceiverName: addressSnapshot.shippingReceiverName,
          shippingReceiverMobile: addressSnapshot.shippingReceiverMobile,
          shippingProvince: addressSnapshot.shippingProvince,
          shippingCity: addressSnapshot.shippingCity,
          shippingAddressLine: addressSnapshot.shippingAddressLine,
          shippingPostalCode: addressSnapshot.shippingPostalCode,
          shippingPlaque: addressSnapshot.shippingPlaque,
          shippingUnit: addressSnapshot.shippingUnit,

          items: {
            create: orderItemsData,
          },
        },
      });

      if (couponConnect && discountTotal > 0) {
        await tx.couponUsage.create({
          data: {
            coupon: {
              connect: {
                id: couponConnect.id,
              },
            },
            user: {
              connect: {
                id: userId,
              },
            },
            order: {
              connect: {
                id: order.id,
              },
            },
            discountAmount: new Prisma.Decimal(discountTotal),
          },
        });

        await tx.coupon.update({
          where: {
            id: couponConnect.id,
          },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      for (const cartItem of cart.items) {
        const stockUpdate = await tx.productVariant.updateMany({
          where: {
            id: cartItem.variantId,
            isActive: true,
            stock: {
              gte: cartItem.quantity,
            },
          },
          data: {
            stock: {
              decrement: cartItem.quantity,
            },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new BadRequestException(
            'موجودی یکی از محصولات برای ثبت سفارش کافی نیست',
          );
        }
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      const fullOrder = await tx.order.findUnique({
        where: {
          id: order.id,
        },
        include: this.getOrderInclude(),
      });

      if (!fullOrder) {
        throw new NotFoundException('سفارش ساخته شد اما پیدا نشد');
      }

      return fullOrder;
    });

    return {
      message: 'سفارش با موفقیت ثبت شد',
      order: this.formatOrder(result),
    };
  }

  async getMyOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: this.getOrderInclude(),
    });

    return {
      data: orders.map((order) => this.formatOrder(order)),
      meta: {
        total: orders.length,
      },
    };
  }

  async getMyOrderById(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: this.getOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    return this.formatOrder(order);
  }

  async getMyOrderInvoice(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: this.getOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    return {
      message: 'فاکتور سفارش با موفقیت دریافت شد',
      invoice: this.formatInvoice(order),
    };
  }

  async getMyOrderInvoicePrintHtml(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: this.getOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    const invoice = this.formatInvoice(order);

    return this.buildInvoicePrintHtml(invoice);
  }

  async getMyOrderInvoicePdf(userId: number, orderId: number) {
    const html = await this.getMyOrderInvoicePrintHtml(userId, orderId);
    const buffer = await htmlToPdfBuffer(html);

    return {
      fileName: `FEL-${String(orderId).padStart(6, '0')}.pdf`,
      buffer,
    };
  }

  async getAdminOrders(query: AdminOrderQuery) {
    const page = this.toNumber(query.page, 1);
    const limit = Math.min(this.toNumber(query.limit, 20), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      const status = query.status as OrderStatus;

      if (!Object.values(OrderStatus).includes(status)) {
        throw new BadRequestException('وضعیت سفارش نامعتبر است');
      }

      where.status = status;
    }

    if (query.search) {
      const search = query.search.trim();
      const numericSearch = Number(search);

      where.OR = [
        {
          user: {
            mobile: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            fullName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          shippingReceiverName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          shippingReceiverMobile: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          couponCode: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];

      if (!Number.isNaN(numericSearch) && numericSearch > 0) {
        where.OR.push({
          id: numericSearch,
        });
      }
    }

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({
        where,
      }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: this.getOrderInclude(),
      }),
    ]);

    return {
      data: orders.map((order) => this.formatOrder(order)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      filters: {
        status: query.status || null,
        search: query.search || null,
      },
    };
  }

  async getAdminOrderById(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: this.getOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    return this.formatOrder(order);
  }

  async getAdminOrderInvoice(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: this.getOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    return {
      message: 'فاکتور سفارش با موفقیت دریافت شد',
      invoice: this.formatInvoice(order),
    };
  }

  async getAdminOrderInvoicePrintHtml(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: this.getOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    const invoice = this.formatInvoice(order);

    return this.buildInvoicePrintHtml(invoice);
  }

  async getAdminOrderInvoicePdf(orderId: number) {
    const html = await this.getAdminOrderInvoicePrintHtml(orderId);
    const buffer = await htmlToPdfBuffer(html);

    return {
      fileName: `FEL-${String(orderId).padStart(6, '0')}.pdf`,
      buffer,
    };
  }

  async updateAdminOrderShipping(
    orderId: number,
    dto: UpdateOrderShippingDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    const updatedOrder = await this.prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        shippingProvider: dto.shippingProvider,
        shippingStatus: dto.shippingStatus,

        shippingCost:
          dto.shippingCost !== undefined
            ? new Prisma.Decimal(dto.shippingCost)
            : undefined,

        trackingCode:
          dto.trackingCode !== undefined
            ? dto.trackingCode.trim() || null
            : undefined,

        trackingUrl:
          dto.trackingUrl !== undefined
            ? dto.trackingUrl.trim() || null
            : undefined,

        providerOrderId:
          dto.providerOrderId !== undefined
            ? dto.providerOrderId.trim() || null
            : undefined,

        shippedAt: dto.shippedAt ? new Date(dto.shippedAt) : undefined,
        deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : undefined,

        shippingNote:
          dto.shippingNote !== undefined
            ? dto.shippingNote.trim() || null
            : undefined,
      },
      include: this.getOrderInclude(),
    });

    return {
      message: 'اطلاعات ارسال سفارش با موفقیت ثبت شد',
      order: this.formatOrder(updatedOrder),
    };
  }

  async updateAdminOrderStatus(orderId: number, dto: UpdateOrderStatusDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundException('سفارش پیدا نشد');
      }

      const previousStatus = order.status;
      const nextStatus = dto.status;

      if (previousStatus === nextStatus) {
        const sameOrder = await tx.order.findUnique({
          where: {
            id: orderId,
          },
          include: this.getOrderInclude(),
        });

        if (!sameOrder) {
          throw new NotFoundException('سفارش پیدا نشد');
        }

        return sameOrder;
      }

      const wasStockReturned = this.isStockReturnedStatus(previousStatus);
      const willStockReturn = this.isStockReturnedStatus(nextStatus);

      if (!wasStockReturned && willStockReturn) {
        for (const item of order.items) {
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

      if (wasStockReturned && !willStockReturn) {
        for (const item of order.items) {
          const stockUpdate = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              stock: {
                gte: item.quantity,
              },
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          if (stockUpdate.count !== 1) {
            throw new BadRequestException(
              'برای فعال‌سازی دوباره سفارش، موجودی کافی نیست',
            );
          }
        }
      }

      await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: nextStatus,
        },
      });

      const updatedOrder = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: this.getOrderInclude(),
      });

      if (!updatedOrder) {
        throw new NotFoundException('سفارش پیدا نشد');
      }

      return updatedOrder;
    });

    return {
      message: 'وضعیت سفارش با موفقیت تغییر کرد',
      order: this.formatOrder(result),
    };
  }

  private parsePostexBoolean(value: string | undefined, fallback: boolean) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  private getRequiredEnv(name: string) {
    const value = process.env[name]?.trim();

    if (!value) {
      throw new BadRequestException(`${name} داخل فایل .env تنظیم نشده است`);
    }

    return value;
  }

  private getOptionalEnv(name: string) {
    const value = process.env[name]?.trim();

    return value && value.length > 0 ? value : '';
  }

  private getRequiredEnvNumber(name: string) {
    const value = Number(process.env[name]);

    if (!value || Number.isNaN(value)) {
      throw new BadRequestException(`${name} داخل فایل .env معتبر نیست`);
    }

    return value;
  }

  private splitFullName(fullName?: string | null) {
    const normalized = (fullName || '').trim();

    if (!normalized) {
      return {
        firstName: 'مشتری',
        lastName: 'فلورال',
      };
    }

    const parts = normalized.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return {
        firstName: parts[0],
        lastName: '',
      };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  private buildOrderFullAddress(order: any) {
    return [
      order.shippingProvince,
      order.shippingCity,
      order.shippingAddressLine,
      order.shippingPlaque ? `پلاک ${order.shippingPlaque}` : null,
      order.shippingUnit ? `واحد ${order.shippingUnit}` : null,
    ]
      .filter(Boolean)
      .join('، ');
  }

  private getPostexQuoteMeta(order: any) {
    const snapshot = order.postexQuoteSnapshot as any;

    return {
      selectedPackage: snapshot?.meta?.selectedPackage || null,
      packageInfo: snapshot?.meta?.packageInfo || null,
    };
  }

  private getPostexShipmentDimensions(order: any) {
    const { selectedPackage, packageInfo } = this.getPostexQuoteMeta(order);

    const length =
      Number(selectedPackage?.shipmentLengthCm) ||
      Number(selectedPackage?.packageLengthCm) ||
      Number(packageInfo?.estimatedLengthCm) ||
      10;

    const width =
      Number(selectedPackage?.shipmentWidthCm) ||
      Number(selectedPackage?.packageWidthCm) ||
      Number(packageInfo?.estimatedWidthCm) ||
      10;

    const height =
      Number(selectedPackage?.shipmentHeightCm) ||
      Number(selectedPackage?.packageHeightCm) ||
      Number(packageInfo?.estimatedHeightCm) ||
      10;

    return {
      length: Math.max(Math.ceil(length), 1),
      width: Math.max(Math.ceil(width), 1),
      height: Math.max(Math.ceil(height), 1),
    };
  }

  private getPostexShipmentWeight(order: any) {
    const { packageInfo } = this.getPostexQuoteMeta(order);

    const snapshotWeight = Number(packageInfo?.totalWeightGram);

    if (snapshotWeight > 0) {
      return Math.ceil(snapshotWeight);
    }

    const calculatedWeight = (order.items || []).reduce((sum: number, item: any) => {
      const itemWeight = Number(item.variant?.weightGram || 100);
      const quantity = Number(item.quantity || 0);

      return sum + Math.max(itemWeight, 1) * quantity;
    }, 0);

    return Math.max(Math.ceil(calculatedWeight), 1);
  }

  private getPostexShipmentFlags(order: any) {
    const { packageInfo } = this.getPostexQuoteMeta(order);

    const isFragile =
      typeof packageInfo?.isFragile === 'boolean'
        ? packageInfo.isFragile
        : (order.items || []).some((item: any) => Boolean(item.variant?.isFragile));

    const isLiquid =
      typeof packageInfo?.isLiquid === 'boolean'
        ? packageInfo.isLiquid
        : (order.items || []).some((item: any) => Boolean(item.variant?.isLiquid));

    return {
      isFragile,
      isLiquid,
    };
  }

  private tomanToIrr(value: unknown) {
    return Math.max(Math.ceil(Number(value ?? 0) * 10), 0);
  }

  private buildPostexRegisterPayload(order: any) {
    if (!order.postexCityId) {
      throw new BadRequestException('کد شهر پستکس برای سفارش ثبت نشده است');
    }

    if (!order.postexCourierCode || !order.postexServiceType) {
      throw new BadRequestException('سرویس پستکس برای سفارش ثبت نشده است');
    }

    if (!order.shippingReceiverMobile) {
      throw new BadRequestException('شماره موبایل گیرنده در سفارش ثبت نشده است');
    }

    if (!order.shippingPostalCode) {
      throw new BadRequestException('کد پستی گیرنده در سفارش ثبت نشده است');
    }

    const senderFirstName = this.getRequiredEnv('POSTEX_FROM_FIRST_NAME');
    const senderLastName = this.getOptionalEnv('POSTEX_FROM_LAST_NAME');
    const senderMobile = this.getRequiredEnv('POSTEX_FROM_MOBILE');
    const senderPostCode = this.getRequiredEnv('POSTEX_FROM_POST_CODE');
    const senderCityId = this.getRequiredEnvNumber('POSTEX_FROM_CITY_ID');
    const senderCityName = this.getRequiredEnv('POSTEX_FROM_CITY_NAME');
    const senderAddress = this.getRequiredEnv('POSTEX_FROM_ADDRESS');

    const collectionType =
      process.env.POSTEX_COLLECTION_TYPE?.trim() || 'postex_drop_off';

    const paymentType =
      process.env.POSTEX_PAYMENT_TYPE?.trim() || 'SENDER';

    const receiverName = this.splitFullName(order.shippingReceiverName);
    const dimensions = this.getPostexShipmentDimensions(order);
    const totalWeight = this.getPostexShipmentWeight(order);
    const flags = this.getPostexShipmentFlags(order);

    const orderNo = `FEL-${String(order.id).padStart(6, '0')}`;

    const parcelItems = (order.items || []).map((item: any) => {
      const description = [item.productName, item.variantTitle]
        .filter(Boolean)
        .join(' - ');

      return {
        description: description || `Order item #${item.id}`,
        product_id: item.productId || 0,
        properties: {
          order_item_id: String(item.id),
          variant_id: String(item.variantId),
        },
        quantity: item.quantity,
        sku: item.sku || String(item.variantId),
        price: this.tomanToIrr(item.price),
        weight: Math.max(Number(item.variant?.weightGram || 100), 1),
      };
    });

    const payload: Record<string, unknown> = {
      collection_type: collectionType,
      remark: `Feloral order ${orderNo}`,
      custom_batch_no: `FELORAL-${orderNo}`,
      custom_channel: 'api',
      parcels: [
        {
          from: {
            contact: {
              first_name: senderFirstName,
              last_name: senderLastName,
              mobile_no: senderMobile,
              telephone_no: this.getOptionalEnv('POSTEX_FROM_TELEPHONE'),
              email_address: this.getOptionalEnv('POSTEX_FROM_EMAIL'),
              company_name: this.getOptionalEnv('POSTEX_FROM_COMPANY_NAME'),
              national_code: this.getOptionalEnv('POSTEX_FROM_NATIONAL_CODE'),
            },
            location: {
              post_code: senderPostCode,
              country: this.getOptionalEnv('POSTEX_FROM_COUNTRY') || 'IR',
              city_id: senderCityId,
              city_name: senderCityName,
              address: senderAddress,
              lat: this.getOptionalEnv('POSTEX_FROM_LAT'),
              lon: this.getOptionalEnv('POSTEX_FROM_LON'),
            },
          },
          to: {
            contact: {
              first_name: receiverName.firstName,
              last_name: receiverName.lastName,
              mobile_no: order.shippingReceiverMobile,
              telephone_no: order.shippingReceiverMobile,
              email_address: order.user?.email || '',
              company_name: '',
              national_code: '',
            },
            location: {
              post_code: order.shippingPostalCode,
              country: 'IR',
              city_id: order.postexCityId,
              city_name: order.shippingCity || '',
              address: this.buildOrderFullAddress(order),
              lat: '',
              lon: '',
            },
          },
          parcel_items: parcelItems,
          additional_data: {
            feloral_order_id: String(order.id),
            authority: order.authority || '',
          },
          parcel_properties: {
            length: dimensions.length,
            width: dimensions.width,
            height: dimensions.height,
            total_weight: totalWeight,
            is_fragile: flags.isFragile,
            is_liquid: flags.isLiquid,
            total_value: this.tomanToIrr(order.subtotal),
            pre_paid_amount: this.tomanToIrr(order.payableTotal || order.total),
            total_value_currency: 'IRR',
            box_type_id: order.postexBoxTypeId || 6,
          },
          courier: {
            name: order.postexCourierCode,
            service_type: order.postexServiceType,
            payment_type: paymentType,
          },
          added_service: {
            request_label: this.parsePostexBoolean(
              process.env.POSTEX_REQUEST_LABEL,
              true,
            ),
            request_packaging: this.parsePostexBoolean(
              process.env.POSTEX_REQUEST_PACKAGING,
              false,
            ),
            request_sms_notification: this.parsePostexBoolean(
              process.env.POSTEX_REQUEST_SMS_NOTIFICATION,
              true,
            ),
          },
          delivery_instructions:
            order.shippingNote || 'لطفاً مرسوله با احتیاط حمل شود',
          custom_order_no: orderNo,
          custom_reference_no: String(order.id),
          remarks: `Feloral order ${order.id}`,
          submit_channel: 'api',
          ready_to_accept: true,
        },
      ],
    };

    const dropOffLocationId = Number(process.env.POSTEX_DROP_OFF_LOCATION_ID);
    const fromAddressBookId = Number(process.env.POSTEX_FROM_ADDRESS_BOOK_ID);

    const parcels = payload.parcels as Array<Record<string, unknown>>;

    if (dropOffLocationId && !Number.isNaN(dropOffLocationId)) {
      parcels[0].drop_off_location_id = dropOffLocationId;
    }

    if (fromAddressBookId && !Number.isNaN(fromAddressBookId)) {
      parcels[0].from_address_book_id = fromAddressBookId;
    }

    return payload;
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

  private extractPostexTrackingCode(response: unknown) {
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

  private extractPostexProviderOrderId(response: unknown) {
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

  private extractPostexTrackingUrl(response: unknown) {
    return this.findDeepValue(response, [
      'trackingUrl',
      'tracking_url',
      'tracking_link',
      'trackingLink',
    ]);
  }

  private getPostexErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }


  private getPostexWalletAmountIrr(wallet: any) {
    const amount = Number(wallet?.amount ?? 0);

    if (Number.isNaN(amount) || amount < 0) {
      return 0;
    }

    return amount;
  }

  private getPostexWalletFrozenAmountIrr(wallet: any) {
    const frozenAmount = Number(wallet?.frozenAmount ?? 0);

    if (Number.isNaN(frozenAmount) || frozenAmount < 0) {
      return 0;
    }

    return frozenAmount;
  }

  private getPostexWalletUserId(wallet: any) {
    return wallet?.userId || wallet?.userID || null;
  }

  private buildPostexWalletInsufficientError(
    wallet: any,
    shippingCostToman: number,
  ) {
    const walletAmountIrr = this.getPostexWalletAmountIrr(wallet);
    const walletFrozenAmountIrr = this.getPostexWalletFrozenAmountIrr(wallet);
    const requiredAmountIrr = Math.ceil(shippingCostToman * 10);

    return {
      message: 'موجودی کیف پول پستکس برای ثبت این مرسوله کافی نیست',
      wallet: {
        amountIrr: walletAmountIrr,
        amountToman: Math.floor(walletAmountIrr / 10),
        frozenAmountIrr: walletFrozenAmountIrr,
        frozenAmountToman: Math.floor(walletFrozenAmountIrr / 10),
        userId: this.getPostexWalletUserId(wallet),
      },
      required: {
        shippingCostToman,
        requiredAmountIrr,
      },
      hint: 'کیف پول پستکس را شارژ کنید و سپس ثبت مرسوله را دوباره بزنید',
    };
  }

  async registerPostexShipment(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: this.getOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    if (order.status !== OrderStatus.paid) {
      throw new BadRequestException('فقط سفارش پرداخت‌شده قابل ثبت در پستکس است');
    }

    if (order.shipmentCreatedAt) {
      throw new BadRequestException('این سفارش قبلاً در پستکس ثبت شده است');
    }

    const payload = this.buildPostexRegisterPayload(order);

    try {
      const wallet = await this.shippingService.getPostexWalletBalance();
      const shippingCostToman = Number(order.shippingCost ?? 0);
      const walletAmountIrr = this.getPostexWalletAmountIrr(wallet);
      const requiredAmountIrr = Math.ceil(shippingCostToman * 10);

      if (shippingCostToman > 0 && walletAmountIrr < requiredAmountIrr) {
        throw new BadRequestException(
          this.buildPostexWalletInsufficientError(
            wallet,
            shippingCostToman,
          ),
        );
      }

      const response = await this.shippingService.registerPostexShipment(
        payload,
      );

      const trackingCode = this.extractPostexTrackingCode(response);
      const providerOrderId = this.extractPostexProviderOrderId(response);
      const trackingUrl = this.extractPostexTrackingUrl(response);

      const updatedOrder = await this.prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          postexShipmentSnapshot: this.toPrismaJson({
            request: payload,
            wallet,
            response,
          }),
          shipmentCreatedAt: new Date(),
          shipmentError: null,
          trackingCode: trackingCode || undefined,
          providerOrderId: providerOrderId || undefined,
          trackingUrl: trackingUrl || undefined,
          shippingNote: trackingCode
            ? `مرسوله در پستکس ثبت شد. کد رهگیری: ${trackingCode}`
            : 'مرسوله در پستکس ثبت شد',
        },
        include: this.getOrderInclude(),
      });

      return {
        message: 'مرسوله با موفقیت در پستکس ثبت شد',
        order: this.formatOrder(updatedOrder),
        postex: {
          wallet,
          response,
          trackingCode,
          providerOrderId,
          trackingUrl,
        },
      };
    } catch (error) {
      await this.prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          shipmentError: this.getPostexErrorMessage(error).slice(0, 1000),
        },
      });

      throw error;
    }
  }

}