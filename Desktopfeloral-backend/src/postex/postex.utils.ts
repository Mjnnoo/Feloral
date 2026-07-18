import { createHash, createHmac, timingSafeEqual } from 'crypto';

export interface PostexQuoteOption {
  serviceCode: string;
  courierCode?: string;
  serviceName: string;
  serviceType?: string;
  providerPrice: number;
  estimatedDelivery?: string;
  boxTypeId?: number;
  packageCode?: string;
  packageTitle?: string;
  raw: unknown;
}

export interface ParcelSummary {
  totalWeightGram: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  itemCount: number;
}

const objectValue = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

export const pick = (value: unknown, keys: string[]): unknown => {
  const object = objectValue(value);
  if (!object) return undefined;

  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null) return object[key];
  }

  return undefined;
};

export const pickString = (
  value: unknown,
  keys: string[],
): string | undefined => {
  const selected = pick(value, keys);
  if (selected === undefined) return undefined;
  const normalized = String(selected).trim();
  return normalized || undefined;
};

export const pickNumber = (
  value: unknown,
  keys: string[],
): number | undefined => {
  const selected = pick(value, keys);
  if (selected === undefined) return undefined;
  const normalized = Number(String(selected).replace(/,/g, ''));
  return Number.isFinite(normalized) ? normalized : undefined;
};

const findFirstArray = (value: unknown, depth = 0): unknown[] | undefined => {
  if (depth > 5) return undefined;
  if (Array.isArray(value)) return value;

  const object = objectValue(value);
  if (!object) return undefined;

  const preferred = [
    'services',
    'shippingServices',
    'quotes',
    'items',
    'results',
    'data',
    'result',
  ];

  for (const key of preferred) {
    if (!(key in object)) continue;
    const found = findFirstArray(object[key], depth + 1);
    if (found) return found;
  }

  for (const nested of Object.values(object)) {
    const found = findFirstArray(nested, depth + 1);
    if (found) return found;
  }

  return undefined;
};

export function normalizeQuoteOptions(response: unknown): PostexQuoteOption[] {
  const rows = findFirstArray(response) || [];

  return rows
    .map((row, index): PostexQuoteOption | undefined => {
      const providerPrice = pickNumber(row, [
        'finalPrice',
        'totalPrice',
        'shippingPrice',
        'shippingCost',
        'price',
        'amount',
        'cost',
        'total',
      ]);

      if (providerPrice === undefined || providerPrice < 0) return undefined;

      const serviceCode =
        pickString(row, [
          'serviceCode',
          'service_code',
          'courierServiceCode',
          'serviceId',
          'service_id',
          'code',
          'id',
        ]) || `service-${index + 1}`;

      return {
        serviceCode,
        courierCode: pickString(row, [
          'courierCode',
          'courier_code',
          'courier',
          'providerCode',
          'companyCode',
        ]),
        serviceName:
          pickString(row, [
            'serviceName',
            'service_name',
            'courierName',
            'title',
            'name',
          ]) || serviceCode,
        serviceType: pickString(row, [
          'serviceType',
          'service_type',
          'type',
          'deliveryType',
        ]),
        providerPrice: Math.round(providerPrice),
        estimatedDelivery: pickString(row, [
          'estimatedDelivery',
          'estimated_delivery',
          'deliveryTime',
          'delivery_time',
          'eta',
          'duration',
        ]),
        boxTypeId: pickNumber(row, ['boxTypeId', 'box_type_id', 'boxId']),
        packageCode: pickString(row, [
          'packageCode',
          'package_code',
          'parcelCode',
        ]),
        packageTitle: pickString(row, [
          'packageTitle',
          'package_title',
          'parcelTitle',
        ]),
        raw: row,
      };
    })
    .filter((item): item is PostexQuoteOption => Boolean(item));
}

export function buildCartFingerprint(
  items: Array<{ variantId: number; quantity: number; price?: unknown }>,
): string {
  const normalized = items
    .map((item) => ({
      variantId: Number(item.variantId),
      quantity: Number(item.quantity),
      price: item.price === undefined ? undefined : String(item.price),
    }))
    .sort((a, b) => a.variantId - b.variantId);

  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function summarizeParcel(
  items: Array<{
    quantity: number;
    variant: {
      weightGram: number;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
    };
  }>,
): ParcelSummary {
  let totalWeightGram = 0;
  let lengthCm = 1;
  let widthCm = 1;
  let heightCm = 0;
  let itemCount = 0;

  for (const item of items) {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const variant = item.variant;
    totalWeightGram += Math.max(1, variant.weightGram || 1) * quantity;
    lengthCm = Math.max(lengthCm, variant.lengthCm || 1);
    widthCm = Math.max(widthCm, variant.widthCm || 1);
    heightCm += Math.max(1, variant.heightCm || 1) * quantity;
    itemCount += quantity;
  }

  return {
    totalWeightGram: Math.max(1, Math.round(totalWeightGram)),
    lengthCm: Math.max(1, Math.round(lengthCm)),
    widthCm: Math.max(1, Math.round(widthCm)),
    heightCm: Math.max(1, Math.round(heightCm)),
    itemCount,
  };
}

export function extractShipmentIdentity(response: unknown) {
  const candidates: unknown[] = [response];
  const object = objectValue(response);
  if (object) {
    candidates.push(object.data, object.result, object.shipment, object.order);
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    const providerOrderId = pickString(candidate, [
      'providerOrderId',
      'orderId',
      'order_id',
      'shipmentId',
      'shipment_id',
      'parcelId',
      'parcel_id',
      'id',
    ]);
    const trackingCode = pickString(candidate, [
      'trackingCode',
      'tracking_code',
      'trackingNumber',
      'tracking_number',
      'barcode',
      'waybill',
    ]);

    if (providerOrderId || trackingCode) {
      return {
        providerOrderId,
        trackingCode,
        trackingUrl: pickString(candidate, [
          'trackingUrl',
          'tracking_url',
          'trackUrl',
          'track_url',
        ]),
        labelUrl: pickString(candidate, [
          'labelUrl',
          'label_url',
          'label',
          'barcodeUrl',
        ]),
        invoiceUrl: pickString(candidate, [
          'invoiceUrl',
          'invoice_url',
          'factorUrl',
          'factor_url',
        ]),
        status: pickString(candidate, [
          'status',
          'shipmentStatus',
          'shipment_status',
          'state',
        ]),
      };
    }
  }

  return {};
}

export function mapPostexShippingStatus(
  value?: string,
):
  | 'not_shipped'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'canceled' {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (!normalized) return 'preparing';
  if (/deliver|تحویل/.test(normalized)) return 'delivered';
  if (/return|مرجوع|برگشت/.test(normalized)) return 'returned';
  if (/cancel|لغو|باطل/.test(normalized)) return 'canceled';
  if (/ship|dispatch|transit|ارسال|توزیع|رهسپار/.test(normalized))
    return 'shipped';
  if (/create|prepare|pickup|collect|ثبت|آماده|جمع/.test(normalized))
    return 'preparing';
  return 'preparing';
}

export function verifyWebhookSecret(
  configuredSecret: string | undefined,
  payload: unknown,
  signature?: string,
  plainSecret?: string,
): boolean {
  if (!configuredSecret) return false;

  if (plainSecret) {
    const left = Buffer.from(plainSecret);
    const right = Buffer.from(configuredSecret);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  if (!signature) return false;
  const normalized = signature
    .replace(/^sha256=/i, '')
    .trim()
    .toLowerCase();
  const expected = createHmac('sha256', configuredSecret)
    .update(JSON.stringify(payload ?? {}))
    .digest('hex');
  const left = Buffer.from(normalized);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
