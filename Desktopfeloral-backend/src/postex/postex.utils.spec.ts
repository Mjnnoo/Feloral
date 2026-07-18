import { createHmac } from 'crypto';

import {
  buildCartFingerprint,
  extractShipmentIdentity,
  mapPostexShippingStatus,
  normalizeQuoteOptions,
  summarizeParcel,
  verifyWebhookSecret,
} from './postex.utils';

describe('Postex utilities', () => {
  it('normalizes quote responses from nested payloads', () => {
    const result = normalizeQuoteOptions({
      data: {
        services: [
          {
            serviceCode: 'EXPRESS',
            courierName: 'Postex Express',
            finalPrice: '125,000',
            deliveryTime: '1-2 days',
          },
        ],
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      serviceCode: 'EXPRESS',
      serviceName: 'Postex Express',
      providerPrice: 125000,
      estimatedDelivery: '1-2 days',
    });
  });

  it('creates a stable cart fingerprint independent of item order', () => {
    const first = buildCartFingerprint([
      { variantId: 2, quantity: 1, price: 200 },
      { variantId: 1, quantity: 3, price: 100 },
    ]);
    const second = buildCartFingerprint([
      { variantId: 1, quantity: 3, price: 100 },
      { variantId: 2, quantity: 1, price: 200 },
    ]);

    expect(first).toBe(second);
  });

  it('summarizes parcel weight and dimensions', () => {
    expect(
      summarizeParcel([
        {
          quantity: 2,
          variant: { weightGram: 100, lengthCm: 10, widthCm: 5, heightCm: 4 },
        },
        {
          quantity: 1,
          variant: { weightGram: 50, lengthCm: 8, widthCm: 7, heightCm: 3 },
        },
      ]),
    ).toEqual({
      totalWeightGram: 250,
      lengthCm: 10,
      widthCm: 7,
      heightCm: 11,
      itemCount: 3,
    });
  });

  it('extracts shipment identifiers and maps provider status', () => {
    const identity = extractShipmentIdentity({
      data: {
        shipmentId: 'PX-100',
        trackingNumber: 'TRACK-100',
        status: 'in transit',
      },
    });

    expect(identity).toMatchObject({
      providerOrderId: 'PX-100',
      trackingCode: 'TRACK-100',
      status: 'in transit',
    });
    expect(mapPostexShippingStatus(identity.status)).toBe('shipped');
  });

  it('validates both HMAC and plain webhook secrets', () => {
    const payload = { shipmentId: 'PX-100', status: 'delivered' };
    const signature = createHmac('sha256', 'secret')
      .update(JSON.stringify(payload))
      .digest('hex');

    expect(verifyWebhookSecret('secret', payload, signature)).toBe(true);
    expect(verifyWebhookSecret('secret', payload, undefined, 'secret')).toBe(
      true,
    );
    expect(verifyWebhookSecret('secret', payload, 'invalid')).toBe(false);
  });
});
