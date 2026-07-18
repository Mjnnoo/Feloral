-- Normalize empty and duplicate barcodes before enforcing uniqueness.
UPDATE "ProductVariant"
SET "barcode" = NULL
WHERE "barcode" IS NOT NULL AND btrim("barcode") = '';

WITH ranked_barcodes AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "barcode"
      ORDER BY "id" ASC
    ) AS row_number
  FROM "ProductVariant"
  WHERE "barcode" IS NOT NULL
)
UPDATE "ProductVariant" AS variant
SET "barcode" = NULL
FROM ranked_barcodes
WHERE variant."id" = ranked_barcodes."id"
  AND ranked_barcodes.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_barcode_key"
ON "ProductVariant"("barcode");

-- Keep exactly one primary image for every product that already has images.
WITH ranked_images AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "productId"
      ORDER BY "isPrimary" DESC, "sortOrder" ASC, "id" ASC
    ) AS row_number
  FROM "ProductImage"
)
UPDATE "ProductImage" AS image
SET "isPrimary" = (ranked_images.row_number = 1)
FROM ranked_images
WHERE image."id" = ranked_images."id";

CREATE UNIQUE INDEX IF NOT EXISTS "ProductImage_one_primary_per_product"
ON "ProductImage"("productId")
WHERE "isPrimary" = true;

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" SERIAL NOT NULL,
  "variantId" INTEGER NOT NULL,
  "actorUserId" INTEGER,
  "delta" INTEGER NOT NULL,
  "balanceBefore" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "reason" TEXT,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Brand_isActive_idx" ON "Brand"("isActive");
CREATE INDEX IF NOT EXISTS "Category_isActive_idx" ON "Category"("isActive");
CREATE INDEX IF NOT EXISTS "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_brandId_isActive_idx" ON "Product"("brandId", "isActive");
CREATE INDEX IF NOT EXISTS "Product_categoryId_isActive_idx" ON "Product"("categoryId", "isActive");
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_isActive_idx" ON "ProductVariant"("productId", "isActive");
CREATE INDEX IF NOT EXISTS "ProductVariant_stock_idx" ON "ProductVariant"("stock");
CREATE INDEX IF NOT EXISTS "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");
CREATE INDEX IF NOT EXISTS "StockMovement_variantId_createdAt_idx" ON "StockMovement"("variantId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_actorUserId_createdAt_idx" ON "StockMovement"("actorUserId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StockMovement_variantId_fkey'
  ) THEN
    ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StockMovement_actorUserId_fkey'
  ) THEN
    ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
