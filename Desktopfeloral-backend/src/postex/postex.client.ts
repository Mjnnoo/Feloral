import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, Method } from 'axios';

interface TokenCache {
  value: string;
  expiresAt: number;
}

@Injectable()
export class PostexClient {
  private tokenCache?: TokenCache;

  constructor(private readonly configService: ConfigService) {}

  cities(params: Record<string, unknown>) {
    return this.request(
      'GET',
      this.path(
        'POSTEX_CITIES_PATH',
        '/api/v1/locality/cities/to/all',
      ),
      {
        params,
      },
    );
  }

  provinces() {
    return this.request(
      'GET',
      this.path(
        'POSTEX_PROVINCES_PATH',
        '/api/v1/locality/provinces',
      ),
    );
  }

  destinationCitiesByProvince(provinceCode: string) {
    return this.request(
      'GET',
      this.templatedPath(
        'POSTEX_CITIES_BY_PROVINCE_PATH',
        '/api/v1/locality/cities/to/{provinceCode}',
        provinceCode,
        'provinceCode',
      ),
    );
  }

  boxTypes() {
    return this.request(
      'GET',
      this.path(
        'POSTEX_BOX_TYPES_PATH',
        '/api/v1/common/boxes',
      ),
    );
  }

  quote(payload: unknown) {
    return this.request(
      'POST',
      this.path(
        'POSTEX_QUOTE_PATH',
        '/api/v1/shipping/quotes',
      ),
      {
        data: payload,
      },
    );
  }

  createShipment(payload: unknown, idempotencyKey: string) {
    return this.request(
      'POST',
      this.path(
        'POSTEX_CREATE_SHIPMENT_PATH',
        '/api/v1/parcels/bulk',
      ),
      {
        data: payload,
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
  }

  trackShipment(parcelNo: string) {
    return this.request(
      'GET',
      this.templatedPath(
        'POSTEX_TRACK_SHIPMENT_PATH',
        '/api/v1/tracking/events/{parcelNo}',
        parcelNo,
        'parcelNo',
      ),
    );
  }

  getParcel(parcelNo: string) {
    return this.request(
      'GET',
      this.templatedPath(
        'POSTEX_GET_PARCEL_PATH',
        '/api/v1/parcels/{parcelNo}',
        parcelNo,
        'parcelNo',
      ),
    );
  }

  getParcelByOrderNo(orderNo: string) {
    return this.request(
      'GET',
      this.templatedPath(
        'POSTEX_GET_PARCEL_BY_ORDER_PATH',
        '/api/v1/parcels/custom-order-no/{orderNo}',
        orderNo,
        'orderNo',
      ),
    );
  }

  walletBalance() {
    return this.request(
      'GET',
      this.path(
        'POSTEX_WALLET_BALANCE_PATH',
        '/api/v1/wallet/balance',
      ),
    );
  }

  cancelShipment(parcelNo: string, reason?: string) {
    return this.request(
      'POST',
      this.templatedPath(
        'POSTEX_CANCEL_SHIPMENT_PATH',
        '/api/v1/parcels/cancel-request/{parcelNo}',
        parcelNo,
        'parcelNo',
      ),
      {
        data: {
          reason,
        },
      },
    );
  }

  async testConnection() {
    return this.provinces();
  }

  private async request(
    method: Method,
    path: string,
    options: Pick<AxiosRequestConfig, 'data' | 'params' | 'headers'> = {},
    retryAuth = true,
  ): Promise<unknown> {
    this.assertEnabled();

    try {
      const response = await axios.request({
        method,
        url: `${this.baseUrl()}${path}`,
        timeout: this.timeoutMs(),
        data: options.data,
        params: options.params,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(await this.authHeaders()),
          ...options.headers,
        },
      });

      return response.data;
    } catch (error) {
      if (
        retryAuth &&
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        this.canAcquireToken()
      ) {
        this.tokenCache = undefined;
        return this.request(method, path, options, false);
      }

      throw new BadGatewayException(this.extractError(error));
    }
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const apiKey = this.configService
      .get<string>('POSTEX_API_KEY')
      ?.trim();

    const headers: Record<string, string> = {};

    if (apiKey) {
      const header = this.configService.get<string>(
        'POSTEX_API_KEY_HEADER',
        'x-api-key',
      );

      headers[header] = apiKey;
    }

    return headers;
  }

  private assertEnabled() {
    const enabled = this.configService.get<string>(
      'POSTEX_ENABLED',
      'false',
    );

    if (!['true', '1', 'yes'].includes(String(enabled).toLowerCase())) {
      throw new ServiceUnavailableException(
        'اتصال Postex غیرفعال است',
      );
    }
  }

  private canAcquireToken() {
    return false;
  }

  private baseUrl() {
    return this.configService
      .get<string>(
        'POSTEX_BASE_URL',
        'https://api.postex.ir',
      )
      .replace(/\/+$/, '');
  }

  private path(key: string, fallback: string) {
    const value = this.configService
      .get<string>(key, fallback)
      .trim();

    if (/^https?:\/\//i.test(value)) {
      throw new ServiceUnavailableException(
        `${key} باید فقط مسیر API باشد`,
      );
    }

    return value.startsWith('/')
      ? value
      : `/${value}`;
  }

  private templatedPath(
    key: string,
    fallback: string,
    value: string,
    placeholder: string,
  ) {
    const path = this.path(key, fallback);

    return path.replace(
      `{${placeholder}}`,
      encodeURIComponent(value),
    );
  }

  private timeoutMs() {
    const configured = Number(
      this.configService.get<string | number>(
        'POSTEX_HTTP_TIMEOUT_MS',
      ),
    );

    return Number.isInteger(configured) &&
      configured >= 3000 &&
      configured <= 60000
      ? configured
      : 15000;
  }

  private extractError(error: unknown) {
    if (axios.isAxiosError(error)) {
      return (
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'ارتباط با Postex ناموفق بود'
      );
    }

    return error instanceof Error
      ? error.message
      : 'ارتباط با Postex ناموفق بود';
  }
  
}
