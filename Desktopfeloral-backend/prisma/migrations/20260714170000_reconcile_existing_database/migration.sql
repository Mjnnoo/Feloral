-- CreateEnum
CREATE TYPE "public"."CouponType" AS ENUM ('percent', 'fixed');

-- CreateEnum
CREATE TYPE "public"."EditableContentType" AS ENUM ('text', 'rich_text', 'image', 'video', 'json', 'link', 'color', 'font');

-- CreateEnum
CREATE TYPE "public"."HomepageSectionStatus" AS ENUM ('draft', 'published', 'hidden');

-- CreateEnum
CREATE TYPE "public"."HomepageSectionType" AS ENUM ('hero', 'benefits', 'products', 'categories', 'banner', 'fragrance', 'editorial', 'custom', 'ai_internal');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'canceled', 'refunded', 'failed');

-- CreateEnum
CREATE TYPE "public"."PriceInsightLevel" AS ENUM ('unknown', 'low', 'competitive', 'high');

-- CreateEnum
CREATE TYPE "public"."PriceSnapshotSource" AS ENUM ('manual', 'crawler', 'api');

-- CreateEnum
CREATE TYPE "public"."ProductRegionType" AS ENUM ('lips', 'nails', 'cheeks', 'eyes', 'face', 'hair');

-- CreateEnum
CREATE TYPE "public"."ProductShadeFinish" AS ENUM ('matte', 'glossy', 'satin', 'velvet', 'shimmer', 'cream');

-- CreateEnum
CREATE TYPE "public"."ShippingProvider" AS ENUM ('post', 'tipax', 'alopeyk', 'snapp', 'tapsi', 'courier', 'free', 'other');

-- CreateEnum
CREATE TYPE "public"."ShippingStatus" AS ENUM ('not_shipped', 'preparing', 'shipped', 'delivered', 'returned', 'canceled');

-- CreateEnum
CREATE TYPE "public"."TryOnStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_brandId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- DropIndex
DROP INDEX "public"."Brand_name_key";

-- AlterTable
ALTER TABLE "public"."Product" ALTER COLUMN "brandId" DROP NOT NULL,
ALTER COLUMN "categoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."ProductVariant" ADD COLUMN     "heightCm" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "isFragile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLiquid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lengthCm" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "weightGram" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "widthCm" INTEGER NOT NULL DEFAULT 10,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "salePrice" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "fullName" DROP NOT NULL,
ALTER COLUMN "password" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."Address" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT,
    "receiverName" TEXT NOT NULL,
    "receiverMobile" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "postalCode" TEXT,
    "plaque" TEXT,
    "unit" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postexCityId" INTEGER,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BeautyProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "skinType" TEXT,
    "undertone" TEXT,
    "scentFamilies" TEXT[],
    "favoriteNotes" TEXT[],
    "allergies" TEXT[],
    "preferredBrands" TEXT[],
    "budgetMin" DECIMAL(18,2),
    "budgetMax" DECIMAL(18,2),
    "beautyGoals" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeautyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cart" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CartItem" (
    "id" SERIAL NOT NULL,
    "cartId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Competitor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "availabilitySelector" TEXT,
    "priceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "priceSelector" TEXT,
    "salePriceSelector" TEXT,
    "titleSelector" TEXT,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompetitorProductLink" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "competitorId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "externalSku" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorProductLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Coupon" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "type" "public"."CouponType" NOT NULL DEFAULT 'percent',
    "value" DECIMAL(18,2) NOT NULL,
    "maxDiscount" DECIMAL(18,2),
    "minOrderAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "usageLimit" INTEGER,
    "usageLimitPerUser" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CouponUsage" (
    "id" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EditableContent" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "type" "public"."EditableContentType" NOT NULL DEFAULT 'text',
    "title" TEXT,
    "plainText" TEXT,
    "value" JSONB,
    "sectionId" INTEGER,
    "mediaId" INTEGER,
    "fontFamily" TEXT,
    "fontWeight" TEXT,
    "color" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditableContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HomepageSection" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "type" "public"."HomepageSectionType" NOT NULL DEFAULT 'custom',
    "status" "public"."HomepageSectionStatus" NOT NULL DEFAULT 'published',
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MediaAsset" (
    "id" SERIAL NOT NULL,
    "key" TEXT,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "alt" TEXT,
    "title" TEXT,
    "description" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authority" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "addressId" INTEGER,
    "shippingAddressLine" TEXT,
    "shippingCity" TEXT,
    "shippingPlaque" TEXT,
    "shippingPostalCode" TEXT,
    "shippingProvince" TEXT,
    "shippingReceiverMobile" TEXT,
    "shippingReceiverName" TEXT,
    "shippingUnit" TEXT,
    "couponCode" TEXT,
    "couponId" INTEGER,
    "discountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "payableTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMP(3),
    "providerOrderId" TEXT,
    "shippedAt" TIMESTAMP(3),
    "shippingCost" DECIMAL(12,0) NOT NULL DEFAULT 0,
    "shippingNote" TEXT,
    "shippingProvider" "public"."ShippingProvider",
    "shippingStatus" "public"."ShippingStatus" NOT NULL DEFAULT 'not_shipped',
    "trackingCode" TEXT,
    "trackingUrl" TEXT,
    "postexBoxTypeId" INTEGER,
    "postexCityId" INTEGER,
    "postexCourierCode" TEXT,
    "postexEstimatedDelivery" TEXT,
    "postexInternalExtraCost" DECIMAL(12,0) NOT NULL DEFAULT 0,
    "postexPackageCode" TEXT,
    "postexPackageTitle" TEXT,
    "postexQuoteSnapshot" JSONB,
    "postexServiceName" TEXT,
    "postexServiceType" TEXT,
    "postexShipmentSnapshot" JSONB,
    "shipmentCreatedAt" TIMESTAMP(3),
    "shipmentError" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" INTEGER,
    "productName" TEXT NOT NULL DEFAULT '',
    "sku" TEXT,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "variantTitle" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PriceSnapshot" (
    "id" SERIAL NOT NULL,
    "competitorProductLinkId" INTEGER NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "salePrice" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "source" "public"."PriceSnapshotSource" NOT NULL DEFAULT 'manual',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductExperience" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "visualTheme" TEXT,
    "mood" TEXT,
    "colorPalette" TEXT[],
    "motionPreset" TEXT,
    "heroVideoUrl" TEXT,
    "threeDModelUrl" TEXT,
    "arModelUrl" TEXT,
    "scentFamily" TEXT,
    "topNotes" TEXT[],
    "middleNotes" TEXT[],
    "baseNotes" TEXT[],
    "season" TEXT[],
    "occasion" TEXT[],
    "gender" TEXT,
    "longevity" TEXT,
    "sillage" TEXT,
    "skinTypes" TEXT[],
    "routineStep" TEXT,
    "texture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductIntelligence" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "aiGeneratedTitle" TEXT,
    "aiGeneratedShortDesc" TEXT,
    "aiGeneratedDescription" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[],
    "storyTitle" TEXT,
    "storyText" TEXT,
    "howToUse" TEXT,
    "warnings" TEXT,
    "suitableFor" TEXT[],
    "ingredients" TEXT[],
    "benefits" TEXT[],
    "complementaryProductIds" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductPriceInsight" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "feloralPrice" DECIMAL(18,2) NOT NULL,
    "minMarketPrice" DECIMAL(18,2),
    "avgMarketPrice" DECIMAL(18,2),
    "maxMarketPrice" DECIMAL(18,2),
    "suggestedPrice" DECIMAL(18,2),
    "insightLevel" "public"."PriceInsightLevel" NOT NULL DEFAULT 'unknown',
    "summary" TEXT,
    "recommendedAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPriceInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductShade" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "hexColor" TEXT,
    "region" "public"."ProductRegionType" NOT NULL,
    "finish" "public"."ProductShadeFinish",
    "opacity" DOUBLE PRECISION,
    "previewImage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductShade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "value" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThemeSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'default',
    "primaryFont" TEXT NOT NULL DEFAULT 'Vazirmatn',
    "headingFont" TEXT NOT NULL DEFAULT 'Vazirmatn',
    "bodyFont" TEXT NOT NULL DEFAULT 'Vazirmatn',
    "buttonFont" TEXT NOT NULL DEFAULT 'Vazirmatn',
    "accentColor" TEXT NOT NULL DEFAULT '#d6a84f',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f6f0e8',
    "textColor" TEXT NOT NULL DEFAULT '#101010',
    "darkColor" TEXT NOT NULL DEFAULT '#070707',
    "logoText" TEXT NOT NULL DEFAULT 'FELORAL',
    "logoImageId" INTEGER,
    "availableFonts" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VirtualTryOnSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "shadeId" INTEGER,
    "region" "public"."ProductRegionType",
    "sourceImageUrl" TEXT,
    "resultImageUrl" TEXT,
    "status" "public"."TryOnStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualTryOnSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BeautyProfile_userId_key" ON "public"."BeautyProfile"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "public"."Cart"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_variantId_key" ON "public"."CartItem"("cartId" ASC, "variantId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_slug_key" ON "public"."Competitor"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "public"."Coupon"("code" ASC);

-- CreateIndex
CREATE INDEX "Coupon_expiresAt_idx" ON "public"."Coupon"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "Coupon_isActive_idx" ON "public"."Coupon"("isActive" ASC);

-- CreateIndex
CREATE INDEX "CouponUsage_couponId_idx" ON "public"."CouponUsage"("couponId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_orderId_key" ON "public"."CouponUsage"("orderId" ASC);

-- CreateIndex
CREATE INDEX "CouponUsage_userId_idx" ON "public"."CouponUsage"("userId" ASC);

-- CreateIndex
CREATE INDEX "EditableContent_isPublic_idx" ON "public"."EditableContent"("isPublic" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EditableContent_key_key" ON "public"."EditableContent"("key" ASC);

-- CreateIndex
CREATE INDEX "EditableContent_mediaId_idx" ON "public"."EditableContent"("mediaId" ASC);

-- CreateIndex
CREATE INDEX "EditableContent_sectionId_idx" ON "public"."EditableContent"("sectionId" ASC);

-- CreateIndex
CREATE INDEX "HomepageSection_isPublic_idx" ON "public"."HomepageSection"("isPublic" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "HomepageSection_key_key" ON "public"."HomepageSection"("key" ASC);

-- CreateIndex
CREATE INDEX "HomepageSection_sortOrder_idx" ON "public"."HomepageSection"("sortOrder" ASC);

-- CreateIndex
CREATE INDEX "HomepageSection_status_idx" ON "public"."HomepageSection"("status" ASC);

-- CreateIndex
CREATE INDEX "MediaAsset_isPublic_idx" ON "public"."MediaAsset"("isPublic" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_key_key" ON "public"."MediaAsset"("key" ASC);

-- CreateIndex
CREATE INDEX "Order_couponCode_idx" ON "public"."Order"("couponCode" ASC);

-- CreateIndex
CREATE INDEX "Order_couponId_idx" ON "public"."Order"("couponId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductExperience_productId_key" ON "public"."ProductExperience"("productId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductIntelligence_productId_key" ON "public"."ProductIntelligence"("productId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPriceInsight_productId_key" ON "public"."ProductPriceInsight"("productId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductShade_variantId_key" ON "public"."ProductShade"("variantId" ASC);

-- CreateIndex
CREATE INDEX "SiteSetting_group_idx" ON "public"."SiteSetting"("group" ASC);

-- CreateIndex
CREATE INDEX "SiteSetting_isPublic_idx" ON "public"."SiteSetting"("isPublic" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "public"."SiteSetting"("key" ASC);

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BeautyProfile" ADD CONSTRAINT "BeautyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompetitorProductLink" ADD CONSTRAINT "CompetitorProductLink_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "public"."Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompetitorProductLink" ADD CONSTRAINT "CompetitorProductLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponUsage" ADD CONSTRAINT "CouponUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponUsage" ADD CONSTRAINT "CouponUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EditableContent" ADD CONSTRAINT "EditableContent_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "public"."MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EditableContent" ADD CONSTRAINT "EditableContent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."HomepageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_competitorProductLinkId_fkey" FOREIGN KEY ("competitorProductLinkId") REFERENCES "public"."CompetitorProductLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductExperience" ADD CONSTRAINT "ProductExperience_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductIntelligence" ADD CONSTRAINT "ProductIntelligence_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductPriceInsight" ADD CONSTRAINT "ProductPriceInsight_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductShade" ADD CONSTRAINT "ProductShade_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductShade" ADD CONSTRAINT "ProductShade_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VirtualTryOnSession" ADD CONSTRAINT "VirtualTryOnSession_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VirtualTryOnSession" ADD CONSTRAINT "VirtualTryOnSession_shadeId_fkey" FOREIGN KEY ("shadeId") REFERENCES "public"."ProductShade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VirtualTryOnSession" ADD CONSTRAINT "VirtualTryOnSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
