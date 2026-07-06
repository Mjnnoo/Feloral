import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PostexService } from './postex.service';
import { CartShippingQuoteDto } from './dto/cart-shipping-quote.dto';
import {
  PackageSelectionInput,
  PostexPackageSelectorService,
  SelectedPostexPackage,
} from './postex-package-selector.service';

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postexService: PostexService,
    private readonly postexPackageSelectorService: PostexPackageSelectorService,
  ) {}

  async getCartShippingQuote(userId: number, dto: CartShippingQuoteDto) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('سبد خرید خالی است');
    }

    const activeItems = cart.items.filter((item) => {
      return item.variant.isActive && item.variant.product.isActive;
    });

    if (activeItems.length === 0) {
      throw new BadRequestException('هیچ محصول فعالی در سبد خرید وجود ندارد');
    }

    for (const item of activeItems) {
      if (item.quantity <= 0) {
        throw new BadRequestException('تعداد آیتم‌های سبد خرید نامعتبر است');
      }

      if (item.variant.stock < item.quantity) {
        throw new BadRequestException(
          `موجودی محصول ${item.variant.title} کافی نیست`,
        );
      }
    }

    const packageInfo = this.calculatePackageInfo(activeItems);

    const candidatePackages =
      this.postexPackageSelectorService.getCandidatePackages(packageInfo);

    let lastError: unknown = null;

    for (const selectedPackage of candidatePackages) {
      try {
        const quote = await this.getQuoteWithSelectedPackage(
          dto,
          packageInfo,
          selectedPackage,
        );

        return this.attachPackageMeta(quote, selectedPackage, packageInfo);
      } catch (error) {
        lastError = error;
      }
    }

    throw new BadRequestException({
      message:
        'پستکس هیچ‌کدام از بسته‌های مناسب این سبد خرید را قبول نکرد',
      lastError: this.extractErrorMessage(lastError),
    });
  }


  async registerPostexShipment(payload: Record<string, unknown>) {
    return this.postexService.registerBulkShipment(payload);
  }

  async getPostexWalletBalance() {
    return this.postexService.getWalletBalance();
  }

  private async getQuoteWithSelectedPackage(
    dto: CartShippingQuoteDto,
    packageInfo: PackageSelectionInput,
    selectedPackage: SelectedPostexPackage,
  ) {
    return this.postexService.getCustomerShippingQuote({
      toCityCode: dto.toCityCode,
      weightGram: packageInfo.totalWeightGram,
      valueToman: packageInfo.totalValueToman,

      lengthCm: selectedPackage.shipmentLengthCm,
      widthCm: selectedPackage.shipmentWidthCm,
      heightCm: selectedPackage.shipmentHeightCm,

      boxTypeId: selectedPackage.boxTypeId,

      isFragile: packageInfo.isFragile,
      isLiquid: packageInfo.isLiquid,
      pickupNeeded: dto.pickupNeeded || false,
    });
  }

  private calculatePackageInfo(
    items: Array<{
      quantity: number;
      variant: {
        price: Prisma.Decimal;
        salePrice: Prisma.Decimal | null;
        weightGram: number;
        lengthCm: number;
        widthCm: number;
        heightCm: number;
        isFragile: boolean;
        isLiquid: boolean;
      };
    }>,
  ): PackageSelectionInput {
    let totalWeightGram = 0;
    let totalValueToman = 0;
    let totalVolumeCm3 = 0;

    let maxLengthCm = 1;
    let maxWidthCm = 1;
    let maxHeightCm = 1;

    let isFragile = false;
    let isLiquid = false;

    const packageItems = items.map((item) => {
      const variant = item.variant;
      const quantity = item.quantity;

      const weightGram = Math.max(variant.weightGram || 100, 1);
      const lengthCm = Math.max(variant.lengthCm || 10, 1);
      const widthCm = Math.max(variant.widthCm || 10, 1);
      const heightCm = Math.max(variant.heightCm || 10, 1);

      const finalPrice = this.getFinalPrice(
        variant.price,
        variant.salePrice,
      );

      totalValueToman += finalPrice * quantity;
      totalWeightGram += weightGram * quantity;

      totalVolumeCm3 += lengthCm * widthCm * heightCm * quantity;

      maxLengthCm = Math.max(maxLengthCm, lengthCm);
      maxWidthCm = Math.max(maxWidthCm, widthCm);
      maxHeightCm = Math.max(maxHeightCm, heightCm);

      if (variant.isFragile) {
        isFragile = true;
      }

      if (variant.isLiquid) {
        isLiquid = true;
      }

      return {
        quantity,
        weightGram,
        lengthCm,
        widthCm,
        heightCm,
        isFragile: variant.isFragile,
        isLiquid: variant.isLiquid,
      };
    });

    const estimatedLengthCm = Math.max(Math.ceil(maxLengthCm), 1);
    const estimatedWidthCm = Math.max(Math.ceil(maxWidthCm), 1);

    const estimatedHeightByVolume = Math.ceil(
      totalVolumeCm3 / (estimatedLengthCm * estimatedWidthCm),
    );

    const estimatedHeightCm = Math.max(
      Math.ceil(estimatedHeightByVolume),
      Math.ceil(maxHeightCm),
      1,
    );

    return {
      items: packageItems,
      totalWeightGram: Math.max(Math.ceil(totalWeightGram), 1),
      totalValueToman: Math.max(Math.ceil(totalValueToman), 0),
      isFragile,
      isLiquid,
      estimatedLengthCm,
      estimatedWidthCm,
      estimatedHeightCm,
    };
  }

  private getFinalPrice(
    price: Prisma.Decimal,
    salePrice?: Prisma.Decimal | null,
  ) {
    const originalPrice = Number(price);
    const discountPrice = salePrice ? Number(salePrice) : null;

    if (
      discountPrice &&
      discountPrice > 0 &&
      discountPrice < originalPrice
    ) {
      return discountPrice;
    }

    return originalPrice;
  }

  private attachPackageMeta(
    quote: unknown,
    selectedPackage: SelectedPostexPackage,
    packageInfo: PackageSelectionInput,
  ) {
    if (
      typeof quote === 'object' &&
      quote !== null &&
      !Array.isArray(quote)
    ) {
      const quoteObject = quote as {
        data?: unknown;
        meta?: Record<string, unknown>;
      };

      return {
        ...quoteObject,
        meta: {
          ...(quoteObject.meta || {}),
          selectedPackage,
          packageInfo: {
            totalWeightGram: packageInfo.totalWeightGram,
            totalValueToman: packageInfo.totalValueToman,
            estimatedLengthCm: packageInfo.estimatedLengthCm,
            estimatedWidthCm: packageInfo.estimatedWidthCm,
            estimatedHeightCm: packageInfo.estimatedHeightCm,
            isFragile: packageInfo.isFragile,
            isLiquid: packageInfo.isLiquid,
          },
        },
      };
    }

    return {
      data: quote,
      meta: {
        selectedPackage,
        packageInfo: {
          totalWeightGram: packageInfo.totalWeightGram,
          totalValueToman: packageInfo.totalValueToman,
          estimatedLengthCm: packageInfo.estimatedLengthCm,
          estimatedWidthCm: packageInfo.estimatedWidthCm,
          estimatedHeightCm: packageInfo.estimatedHeightCm,
          isFragile: packageInfo.isFragile,
          isLiquid: packageInfo.isLiquid,
        },
      },
    };
  }

  private extractErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return error;
  }
}