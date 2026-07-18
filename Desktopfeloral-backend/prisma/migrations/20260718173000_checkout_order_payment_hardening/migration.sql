CREATE TYPE "public"."PaymentAttemptStatus" AS ENUM (
  'requested',
  'verified',
  'failed',
  'review_required'
);

ALTER TABLE "public"."Order"
ADD COLUMN "checkoutKey" TEXT,
ADD COLUMN "reservationExpiresAt" TIMESTAMP(3),
ADD COLUMN "stockReleasedAt" TIMESTAMP(3),
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "canceledAt" TIMESTAMP(3),
ADD COLUMN "paymentRefId" TEXT,
ADD COLUMN "paymentCardPan" TEXT;

CREATE UNIQUE INDEX "Order_checkoutKey_key"
ON "public"."Order"("checkoutKey");

CREATE INDEX "Order_userId_createdAt_idx"
ON "public"."Order"("userId", "createdAt");

CREATE INDEX "Order_status_reservationExpiresAt_idx"
ON "public"."Order"("status", "reservationExpiresAt");

CREATE TABLE "public"."PaymentAttempt" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "authority" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" "public"."PaymentAttemptStatus" NOT NULL DEFAULT 'requested',
  "gatewayCode" INTEGER,
  "refId" TEXT,
  "cardPan" TEXT,
  "rawResponse" JSONB,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_authority_key"
ON "public"."PaymentAttempt"("authority");

CREATE INDEX "PaymentAttempt_orderId_createdAt_idx"
ON "public"."PaymentAttempt"("orderId", "createdAt");

CREATE INDEX "PaymentAttempt_status_createdAt_idx"
ON "public"."PaymentAttempt"("status", "createdAt");

ALTER TABLE "public"."PaymentAttempt"
ADD CONSTRAINT "PaymentAttempt_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve in-flight legacy gateway authorities as auditable payment attempts.
INSERT INTO "public"."PaymentAttempt" (
  "orderId",
  "authority",
  "amount",
  "status",
  "gatewayCode",
  "verifiedAt",
  "createdAt",
  "updatedAt"
)
SELECT DISTINCT ON ("authority")
  "id",
  "authority",
  CASE
    WHEN "payableTotal" > 0 THEN "payableTotal"
    ELSE "total"
  END,
  CASE
    WHEN "status" = 'paid' THEN 'verified'::"public"."PaymentAttemptStatus"
    ELSE 'requested'::"public"."PaymentAttemptStatus"
  END,
  CASE WHEN "status" = 'paid' THEN 101 ELSE NULL END,
  CASE WHEN "status" = 'paid' THEN "updatedAt" ELSE NULL END,
  "createdAt",
  "updatedAt"
FROM "public"."Order"
WHERE "authority" IS NOT NULL
  AND btrim("authority") <> ''
ORDER BY "authority", "id" DESC;
