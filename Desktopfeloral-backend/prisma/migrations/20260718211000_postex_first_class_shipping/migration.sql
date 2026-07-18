-- Postex first-class shipping integration
-- This migration is intentionally separate from fulfillment so it can be
-- deployed safely even when the fulfillment migration was already applied.

ALTER TYPE "public"."ShippingProvider" ADD VALUE IF NOT EXISTS 'postex';

CREATE TABLE "ShippingOrigin" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "senderMobile" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "postexCityId" INTEGER NOT NULL,
  "addressLine" TEXT NOT NULL,
  "postalCode" TEXT,
  "plaque" TEXT,
  "unit" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingOrigin_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShippingOrigin_postex_city_positive" CHECK ("postexCityId" > 0)
);

CREATE INDEX "ShippingOrigin_isActive_updatedAt_idx"
  ON "ShippingOrigin"("isActive", "updatedAt");
CREATE UNIQUE INDEX "ShippingOrigin_single_active_idx"
  ON "ShippingOrigin" (("isActive")) WHERE "isActive" = true;

CREATE TABLE "PostexQuote" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "addressId" INTEGER NOT NULL,
  "originId" INTEGER NOT NULL,
  "serviceCode" TEXT NOT NULL,
  "courierCode" TEXT,
  "serviceName" TEXT NOT NULL,
  "serviceType" TEXT,
  "providerPrice" DECIMAL(12,0) NOT NULL,
  "internalExtraCost" DECIMAL(12,0) NOT NULL DEFAULT 0,
  "customerPrice" DECIMAL(12,0) NOT NULL,
  "estimatedDelivery" TEXT,
  "boxTypeId" INTEGER,
  "packageCode" TEXT,
  "packageTitle" TEXT,
  "paymentType" TEXT NOT NULL DEFAULT 'prepaid',
  "pickupType" TEXT NOT NULL DEFAULT 'pickup',
  "insured" BOOLEAN NOT NULL DEFAULT true,
  "smsNotification" BOOLEAN NOT NULL DEFAULT true,
  "packaging" BOOLEAN NOT NULL DEFAULT false,
  "subtotalSnapshot" DECIMAL(18,2) NOT NULL,
  "totalWeightGram" INTEGER NOT NULL,
  "lengthCm" INTEGER NOT NULL,
  "widthCm" INTEGER NOT NULL,
  "heightCm" INTEGER NOT NULL,
  "cartFingerprint" TEXT NOT NULL,
  "requestSnapshot" JSONB,
  "responseSnapshot" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "invalidatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PostexQuote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PostexQuote_nonnegative_prices" CHECK (
    "providerPrice" >= 0 AND "internalExtraCost" >= 0 AND "customerPrice" >= 0
  ),
  CONSTRAINT "PostexQuote_positive_parcel" CHECK (
    "totalWeightGram" > 0 AND "lengthCm" > 0 AND "widthCm" > 0 AND "heightCm" > 0
  )
);

CREATE INDEX "PostexQuote_userId_expiresAt_idx" ON "PostexQuote"("userId", "expiresAt");
CREATE INDEX "PostexQuote_addressId_expiresAt_idx" ON "PostexQuote"("addressId", "expiresAt");
CREATE INDEX "PostexQuote_originId_idx" ON "PostexQuote"("originId");
CREATE INDEX "PostexQuote_serviceCode_idx" ON "PostexQuote"("serviceCode");

ALTER TABLE "PostexQuote" ADD CONSTRAINT "PostexQuote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostexQuote" ADD CONSTRAINT "PostexQuote_addressId_fkey"
  FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostexQuote" ADD CONSTRAINT "PostexQuote_originId_fkey"
  FOREIGN KEY ("originId") REFERENCES "ShippingOrigin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD COLUMN "postexQuoteId" TEXT,
  ADD COLUMN "postexLabelUrl" TEXT,
  ADD COLUMN "postexInvoiceUrl" TEXT,
  ADD COLUMN "postexLastStatus" TEXT,
  ADD COLUMN "postexLastSyncedAt" TIMESTAMP(3),
  ADD COLUMN "postexCanceledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_postexQuoteId_key" ON "Order"("postexQuoteId");
CREATE INDEX "Order_postexLastSyncedAt_idx" ON "Order"("postexLastSyncedAt");
ALTER TABLE "Order" ADD CONSTRAINT "Order_postexQuoteId_fkey"
  FOREIGN KEY ("postexQuoteId") REFERENCES "PostexQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PostexShipmentEvent" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "providerStatus" TEXT,
  "mappedStatus" "ShippingStatus",
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostexShipmentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostexShipmentEvent_orderId_createdAt_idx"
  ON "PostexShipmentEvent"("orderId", "createdAt");
CREATE INDEX "PostexShipmentEvent_source_createdAt_idx"
  ON "PostexShipmentEvent"("source", "createdAt");
ALTER TABLE "PostexShipmentEvent" ADD CONSTRAINT "PostexShipmentEvent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
