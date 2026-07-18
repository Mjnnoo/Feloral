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
      this.path('POSTEX_CITIES_PATH', '/api/v1/cities'),
      {
        params,
      },
    );
  }

  boxTypes() {
    return this.request(
      'GET',
      this.path('POSTEX_BOX_TYPES_PATH', '/api/v1/box-types'),
    );
  }

  quote(payload: unknown) {
    return this.request(
      'POST',
      this.path('POSTEX_QUOTE_PATH', '/api/v1/shipping/quotes'),
      { data: payload },
    );
  }

  createShipment(payload: unknown, idempotencyKey: string) {
    return this.request(
      'POST',
      this.path('POSTEX_CREATE_SHIPMENT_PATH', '/api/v1/shipments'),
      {
        data: payload,
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  trackShipment(shipmentId: string) {
    return this.request(
      'GET',
      this.templatedPath(
        'POSTEX_TRACK_SHIPMENT_PATH',
        '/api/v1/shipments/{shipmentId}/tracking',
        shipmentId,
      ),
    );
  }

  cancelShipment(shipmentId: string, reason?: string) {
    return this.request(
      'POST',
      this.templatedPath(
        'POSTEX_CANCEL_SHIPMENT_PATH',
        '/api/v1/shipments/{shipmentId}/cancel',
        shipmentId,
      ),
      { data: { reason } },
    );
  }

  async testConnection() {
    return this.cities({ page: 1, limit: 1 });
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
    const staticToken = this.configService
      .get<string>('POSTEX_API_TOKEN')
      ?.trim();
    const apiKey = this.configService.get<string>('POSTEX_API_KEY')?.trim();
    const headers: Record<string, string> = {};

    if (staticToken) {
      const header = this.configService.get<string>(
        'POSTEX_TOKEN_HEADER',
        'Authorization',
      );
      const scheme = this.configService.get<string>(
        'POSTEX_AUTH_SCHEME',
        'Bearer',
      );
      headers[header] =
        header.toLowerCase() === 'authorization'
          ? `${scheme} ${staticToken}`.trim()
          : staticToken;
    } else if (this.canAcquireToken()) {
      const token = await this.acquireToken();
      const header = this.configService.get<string>(
        'POSTEX_TOKEN_HEADER',
        'Authorization',
      );
      const scheme = this.configService.get<string>(
        'POSTEX_AUTH_SCHEME',
        'Bearer',
      );
      headers[header] =
        header.toLowerCase() === 'authorization'
          ? `${scheme} ${token}`.trim()
          : token;
    }

    if (apiKey) {
      const apiKeyHeader = this.configService.get<string>(
        'POSTEX_API_KEY_HEADER',
        'X-API-Key',
      );
      headers[apiKeyHeader] = apiKey;
    }

    return headers;
  }

  private async acquireToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.value;
    }

    const username = this.configService.get<string>('POSTEX_USERNAME')?.trim();
    const password = this.configService.get<string>('POSTEX_PASSWORD')?.trim();
    if (!username || !password) {
      throw new ServiceUnavailableException(
        'اطلاعات ورود Postex تنظیم نشده است',
      );
    }

    try {
      const response = await axios.post(
        `${this.baseUrl()}${this.path('POSTEX_AUTH_PATH', '/api/v1/auth/token')}`,
        { username, password },
        {
          timeout: this.timeoutMs(),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data || {};
      const token = String(
        data.token ||
          data.accessToken ||
          data.access_token ||
          data.data?.token ||
          data.data?.accessToken ||
          data.data?.access_token ||
          '',
      ).trim();

      if (!token) {
        throw new Error('پاسخ احراز هویت Postex فاقد توکن است');
      }

      const expiresIn = Number(
        data.expiresIn || data.expires_in || data.data?.expiresIn || 3600,
      );
      this.tokenCache = {
        value: token,
        expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
      };
      return token;
    } catch (error) {
      throw new BadGatewayException(this.extractError(error));
    }
  }

  private assertEnabled() {
    const enabled = this.configService.get<string>('POSTEX_ENABLED', 'false');
    if (!['true', '1', 'yes'].includes(String(enabled).toLowerCase())) {
      throw new ServiceUnavailableException('اتصال Postex غیرفعال است');
    }
  }

  private canAcquireToken() {
    return Boolean(
      this.configService.get<string>('POSTEX_USERNAME')?.trim() &&
      this.configService.get<string>('POSTEX_PASSWORD')?.trim(),
    );
  }

  private baseUrl() {
    return this.configService
      .get<string>('POSTEX_BASE_URL', 'https://api.postex.ir')
      .replace(/\/+$/, '');
  }

  private path(key: string, fallback: string) {
    const value = this.configService.get<string>(key, fallback).trim();
    if (/^https?:\/\//i.test(value)) {
      throw new ServiceUnavailableException(`${key} باید فقط مسیر API باشد`);
    }
    return value.startsWith('/') ? value : `/${value}`;
  }

  private templatedPath(key: string, fallback: string, shipmentId: string) {
    const path = this.path(key, fallback);
    return path.replace('{shipmentId}', encodeURIComponent(shipmentId));
  }

  private timeoutMs() {
    const configured = Number(
      this.configService.get<string | number>('POSTEX_HTTP_TIMEOUT_MS'),
    );
    return Number.isInteger(configured) &&
      configured >= 3000 &&
      configured <= 60_000
      ? configured
      : 15_000;
  }

  private extractError(error: unknown) {
    if (axios.isAxiosError(error)) {
      return (
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.errors?.message ||
        error.message ||
        'ارتباط با Postex ناموفق بود'
      );
    }

    return error instanceof Error
      ? error.message
      : 'ارتباط با Postex ناموفق بود';
  }
}
