DO $$
BEGIN
  CREATE TYPE "OrderStatus" AS ENUM (
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'canceled',
    'refunded',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

UPDATE "Order"
SET "status" = 'pending'
WHERE "status" NOT IN (
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'canceled',
  'refunded',
  'failed'
);

ALTER TABLE "Order"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order"
ALTER COLUMN "status" TYPE "OrderStatus"
USING "status"::"OrderStatus";

ALTER TABLE "Order"
ALTER COLUMN "status" SET DEFAULT 'pending'::"OrderStatus";