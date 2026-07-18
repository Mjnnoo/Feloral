-- Fulfillment, shipping methods, coupon reservations, returns, refunds and invoices

CREATE TYPE "ReturnRequestStatus" AS ENUM (
  'requested', 'approved', 'rejected', 'received',
  'refund_pending', 'refunded', 'canceled'
);

CREATE TYPE "RefundStatus" AS ENUM (
  'pending', 'processing', 'succeeded', 'failed', 'canceled'
);

CREATE TYPE "InvoiceStatus" AS ENUM ('issued', 'refunded', 'voided');

CREATE TABLE "ShippingMethod" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "provider" "ShippingProvider" NOT NULL DEFAULT 'post',
  "flatRate" DECIMAL(12,0) NOT NULL DEFAULT 0,
  "freeAbove" DECIMAL(18,2),
  "estimatedMinDays" INTEGER,
  "estimatedMaxDays" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShippingMethod_nonnegative_values" CHECK (
    "flatRate" >= 0 AND ("freeAbove" IS NULL OR "freeAbove" >= 0)
    AND ("estimatedMinDays" IS NULL OR "estimatedMinDays" >= 0)
    AND ("estimatedMaxDays" IS NULL OR "estimatedMaxDays" >= 0)
  ),
  CONSTRAINT "ShippingMethod_day_range" CHECK (
    "estimatedMinDays" IS NULL OR "estimatedMaxDays" IS NULL
    OR "estimatedMinDays" <= "estimatedMaxDays"
  )
);

CREATE UNIQUE INDEX "ShippingMethod_code_key" ON "ShippingMethod"("code");
CREATE INDEX "ShippingMethod_isActive_sortOrder_idx" ON "ShippingMethod"("isActive", "sortOrder");

ALTER TABLE "Order"
  ADD COLUMN "shippingMethodId" INTEGER,
  ADD COLUMN "refundedTotal" DECIMAL(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "CouponUsage"
  ADD COLUMN "releasedAt" TIMESTAMP(3);

CREATE INDEX "Order_shippingMethodId_idx" ON "Order"("shippingMethodId");
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_shippingMethodId_fkey"
  FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OrderStatusHistory" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "actorUserId" INTEGER,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");
CREATE INDEX "OrderStatusHistory_actorUserId_createdAt_idx" ON "OrderStatusHistory"("actorUserId", "createdAt");
ALTER TABLE "OrderStatusHistory"
  ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderStatusHistory"
  ADD CONSTRAINT "OrderStatusHistory_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "OrderStatusHistory" ("orderId", "actorUserId", "fromStatus", "toStatus", "note", "createdAt")
SELECT "id", "userId", NULL, "status", 'وضعیت اولیه پیش از فعال‌سازی تاریخچه سفارش', "createdAt"
FROM "Order";

CREATE TABLE "ReturnRequest" (
  "id" SERIAL NOT NULL,
  "returnNumber" TEXT NOT NULL,
  "orderId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "status" "ReturnRequestStatus" NOT NULL DEFAULT 'requested',
  "reason" TEXT NOT NULL,
  "customerNote" TEXT,
  "adminNote" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "refundRequestedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "restockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReturnRequest_returnNumber_key" ON "ReturnRequest"("returnNumber");
CREATE INDEX "ReturnRequest_orderId_createdAt_idx" ON "ReturnRequest"("orderId", "createdAt");
CREATE INDEX "ReturnRequest_userId_createdAt_idx" ON "ReturnRequest"("userId", "createdAt");
CREATE INDEX "ReturnRequest_status_createdAt_idx" ON "ReturnRequest"("status", "createdAt");
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReturnItem" (
  "id" SERIAL NOT NULL,
  "returnRequestId" INTEGER NOT NULL,
  "orderItemId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReturnItem_quantity_positive" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "ReturnItem_returnRequestId_orderItemId_key" ON "ReturnItem"("returnRequestId", "orderItemId");
CREATE INDEX "ReturnItem_orderItemId_idx" ON "ReturnItem"("orderItemId");
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnRequestId_fkey"
  FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Refund" (
  "id" SERIAL NOT NULL,
  "refundNumber" TEXT NOT NULL,
  "orderId" INTEGER NOT NULL,
  "returnRequestId" INTEGER,
  "processedByUserId" INTEGER,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'pending',
  "reason" TEXT,
  "gatewayReference" TEXT,
  "adminNote" TEXT,
  "rawResponse" JSONB,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "succeededAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "Refund_refundNumber_key" ON "Refund"("refundNumber");
CREATE UNIQUE INDEX "Refund_returnRequestId_key" ON "Refund"("returnRequestId");
CREATE INDEX "Refund_orderId_createdAt_idx" ON "Refund"("orderId", "createdAt");
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status", "createdAt");
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnRequestId_fkey"
  FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_processedByUserId_fkey"
  FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Invoice" (
  "id" SERIAL NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "orderId" INTEGER NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'issued',
  "subtotal" DECIMAL(18,2) NOT NULL,
  "discountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "shippingCost" DECIMAL(12,0) NOT NULL DEFAULT 0,
  "payableTotal" DECIMAL(18,2) NOT NULL,
  "refundedTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "customerName" TEXT,
  "customerMobile" TEXT,
  "customerAddress" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");
CREATE INDEX "Invoice_status_issuedAt_idx" ON "Invoice"("status", "issuedAt");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
