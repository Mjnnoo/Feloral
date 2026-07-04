import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PostexService } from './postex.service';
import { CartShippingQuoteDto } from './dto/cart-shipping-quote.dto';

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postexService: PostexService,
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

    return this.postexService.getCustomerShippingQuote({
      toCityCode: dto.toCityCode,
      weightGram: packageInfo.weightGram,
      valueToman: packageInfo.valueToman,
      lengthCm: packageInfo.lengthCm,
      widthCm: packageInfo.widthCm,
      heightCm: packageInfo.heightCm,
      boxTypeId: dto.boxTypeId || 6,
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
  ) {
    let totalWeightGram = 0;
    let totalValueToman = 0;
    let totalVolumeCm3 = 0;

    let maxLengthCm = 1;
    let maxWidthCm = 1;

    let isFragile = false;
    let isLiquid = false;

    for (const item of items) {
      const variant = item.variant;
      const quantity = item.quantity;

      const finalPrice = this.getFinalPrice(
        variant.price,
        variant.salePrice,
      );

      totalValueToman += finalPrice * quantity;

      totalWeightGram += Math.max(variant.weightGram || 100, 1) * quantity;

      const lengthCm = Math.max(variant.lengthCm || 10, 1);
      const widthCm = Math.max(variant.widthCm || 10, 1);
      const heightCm = Math.max(variant.heightCm || 10, 1);

      totalVolumeCm3 += lengthCm * widthCm * heightCm * quantity;

      maxLengthCm = Math.max(maxLengthCm, lengthCm);
      maxWidthCm = Math.max(maxWidthCm, widthCm);

      if (variant.isFragile) {
        isFragile = true;
      }

      if (variant.isLiquid) {
        isLiquid = true;
      }
    }

    const calculatedHeightCm = Math.ceil(
      totalVolumeCm3 / (maxLengthCm * maxWidthCm),
    );

    return {
      weightGram: Math.max(totalWeightGram, 1),
      valueToman: Math.max(Math.ceil(totalValueToman), 0),
      lengthCm: Math.max(maxLengthCm, 1),
      widthCm: Math.max(maxWidthCm, 1),
      heightCm: Math.max(calculatedHeightCm, 1),
      isFragile,
      isLiquid,
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
}