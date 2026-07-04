import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { PostexQuoteDto } from './dto/postex-quote.dto';
import { ShippingQuoteDto } from './dto/shipping-quote.dto';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type CityDirection = 'from' | 'to';

type PostexServicePrice = {
  courierLogo?: string;
  courierName?: string;
  courierCode?: string;
  courierNameAlias?: string;
  courierCodeAlias?: string;
  serviceType?: string;
  serviceName?: string;
  slaDays?: string;
  slaHours?: number;
  vat?: number;
  discountAmount?: number;
  totalPrice?: number;
  initPrice?: number;
};

type PostexValueAddedServicePrice = Record<
  string,
  {
    title?: string;
    price?: {
      totalPrice?: number;
    };
  }
>;

type PostexQuoteResponse = {
  currency?: string;
  shipping_prices?: Array<{
    service_price?: PostexServicePrice[];
    value_added_service_price?: PostexValueAddedServicePrice;
  }>;
};

@Injectable()
export class PostexService {
  private readonly baseUrl =
    process.env.POSTEX_BASE_URL || 'https://api.postex.ir';

  private readonly apiKey = process.env.POSTEX_API_KEY;

  private readonly authHeaderName =
    process.env.POSTEX_AUTH_HEADER_NAME || 'x-api-key';

  getConfigStatus() {
    return {
      baseUrl: this.baseUrl,
      hasApiKey: Boolean(this.apiKey),
      authHeaderName: this.authHeaderName,
      fromCityId: process.env.POSTEX_FROM_CITY_ID || null,
    };
  }

  async request<TResponse = unknown>(
    path: string,
    method: HttpMethod = 'GET',
    body?: Record<string, unknown>,
  ): Promise<TResponse> {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'POSTEX_API_KEY داخل فایل .env تنظیم نشده است',
      );
    }

    if (!path.startsWith('/')) {
      throw new BadRequestException('path باید با / شروع شود');
    }

    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [this.authHeaderName]: this.apiKey,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    });

    const text = await response.text();

    let data: unknown = text;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new BadRequestException({
        message: 'درخواست به پستکس ناموفق بود',
        statusCode: response.status,
        response: data,
      });
    }

    return data as TResponse;
  }

  async searchCities(keyword: string, direction: CityDirection = 'to') {
    const normalizedKeyword = keyword?.trim();

    if (!normalizedKeyword) {
      throw new BadRequestException('عبارت جستجوی شهر الزامی است');
    }

    if (!['from', 'to'].includes(direction)) {
      throw new BadRequestException('direction باید from یا to باشد');
    }

    const encodedKeyword = encodeURIComponent(normalizedKeyword);

    return this.request(
      `/api/app/v1/locality/cities/${direction}/all?keyword=${encodedKeyword}`,
      'GET',
    );
  }

  async getCustomerShippingQuote(dto: ShippingQuoteDto) {
    const fromCityCode = Number(process.env.POSTEX_FROM_CITY_ID);

    if (!fromCityCode || Number.isNaN(fromCityCode)) {
      throw new InternalServerErrorException(
        'POSTEX_FROM_CITY_ID داخل فایل .env تنظیم نشده است',
      );
    }

    return this.getShippingQuote({
      fromCityCode,
      toCityCode: dto.toCityCode,
      weightGram: dto.weightGram,
      valueToman: dto.valueToman,
      lengthCm: dto.lengthCm,
      widthCm: dto.widthCm,
      heightCm: dto.heightCm,
      boxTypeId: dto.boxTypeId,
      isFragile: dto.isFragile,
      isLiquid: dto.isLiquid,
      pickupNeeded: dto.pickupNeeded,
    });
  }

  async getShippingQuote(dto: PostexQuoteDto) {
    const payload = this.buildQuotePayload(dto);

    const raw = await this.request<PostexQuoteResponse>(
      '/api/app/v1/shipping/quotes',
      'POST',
      payload,
    );

    return this.normalizeQuoteResponse(raw);
  }

  private buildQuotePayload(dto: PostexQuoteDto) {
    return {
      from_city_code: dto.fromCityCode,
      pickup_needed: dto.pickupNeeded || false,
      collection_type: 'postex_drop_off',
      courier: {
        courier_code: '',
        service_type: '',
      },
      parcels: [
        {
          custom_parcel_id: '',
          to_city_code: dto.toCityCode,
          payment_type: 'SENDER',
          parcel_properties: {
            height: dto.heightCm,
            width: dto.widthCm,
            length: dto.lengthCm,
            box_type_id: dto.boxTypeId || 6,
            is_fragile: dto.isFragile || false,
            is_liquid: dto.isLiquid || false,
            total_weight: String(dto.weightGram),
            total_value: String(dto.valueToman * 10),
            pre_paid_amount: 0,
            total_value_currency: 'IRR',
          },
        },
      ],
      value_added_service: {
        handling_fee: 0,
        request_label: false,
        request_packaging: false,
        request_sms_notification: false,
        request_email_notification: false,
        print_logo: false,
        optional_insurance: false,
      },
      channel: 'ui-v2',
      appName: 'web',
    };
  }

  private normalizeQuoteResponse(raw: PostexQuoteResponse) {
    const firstParcel = raw.shipping_prices?.[0];

    const servicePrices = firstParcel?.service_price || [];

    const extraServiceCostIrr = this.sumValueAddedServices(
      firstParcel?.value_added_service_price,
    );

    const data = servicePrices.map((service) => {
      const baseCostIrr = service.totalPrice || 0;

      return {
        provider: 'postex',
        courierCode: service.courierCode || null,
        courierName: service.courierName || null,
        serviceType: service.serviceType || null,
        title: service.serviceName || null,
        estimatedDelivery: service.slaDays || null,

        baseCostIrr,
        extraServiceCostIrr,

        baseCostToman: this.irrToToman(baseCostIrr),
        extraServiceCostToman: this.irrToToman(extraServiceCostIrr),

        // مبلغی که مشتری در سایت پرداخت می‌کند
        cost: this.irrToToman(baseCostIrr),

        // فقط جهت اطلاع داخلی؛ فعلاً به مشتری اضافه نمی‌کنیم
        internalExtraCost: this.irrToToman(extraServiceCostIrr),

        currency: 'IRT',

        raw: service,
      };
    });

    return {
      data,
      meta: {
        source: 'postex',
        rawCurrency: raw.currency || 'IRR',

        // این هزینه فعلاً به مبلغ مشتری اضافه نمی‌شود
        extraServiceCostIrr,
        extraServiceCostToman: this.irrToToman(extraServiceCostIrr),

        pricingRule:
          'customer_cost_is_base_service_price_only; extra_service_cost_is_internal_info',
      },
    };
  }

  private sumValueAddedServices(
    valueAdded?: PostexValueAddedServicePrice,
  ): number {
    if (!valueAdded) {
      return 0;
    }

    return Object.values(valueAdded).reduce((sum, item) => {
      return sum + (item.price?.totalPrice || 0);
    }, 0);
  }

  private irrToToman(valueIrr: number) {
    return Math.ceil(valueIrr / 10);
  }
}