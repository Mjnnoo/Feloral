import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const cartWithItemsInclude = Prisma.validator<Prisma.CartInclude>()({
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              brand: true,
              category: true,
              images: {
                orderBy: [
                  { isPrimary: 'desc' },
                  { sortOrder: 'asc' },
                  { id: 'asc' },
                ],
              },
            },
          },
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  },
});

type CartWithItems = Prisma.CartGetPayload<{
  include: typeof cartWithItemsInclude;
}>;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private getFinalPrice(
    price: Prisma.Decimal,
    salePrice?: Prisma.Decimal | null,
  ) {
    const originalPrice = Number(price);
    const discountPrice = salePrice ? Number(salePrice) : null;

    const finalPrice =
      discountPrice && discountPrice > 0 && discountPrice < originalPrice
        ? discountPrice
        : originalPrice;

    const discountAmount = originalPrice - finalPrice;

    const discountPercent =
      discountAmount > 0
        ? Math.round((discountAmount / originalPrice) * 100)
        : 0;

    return {
      originalPrice,
      salePrice: discountPrice,
      finalPrice,
      discountAmount,
      discountPercent,
      hasDiscount: discountPercent > 0,
    };
  }

  private formatCart(cart: CartWithItems) {
    const items = cart.items.map((item) => {
      const variant = item.variant;
      const product = variant.product;

      const priceInfo = this.getFinalPrice(variant.price, variant.salePrice);

      const lineOriginalTotal = priceInfo.originalPrice * item.quantity;
      const lineFinalTotal = priceInfo.finalPrice * item.quantity;
      const lineDiscountTotal = priceInfo.discountAmount * item.quantity;

      const primaryImage =
        product.images.find((image) => image.isPrimary)?.imageUrl ||
        product.images[0]?.imageUrl ||
        null;

      return {
        id: item.id,
        quantity: item.quantity,

        product: {
          id: product.id,
          name: product.name,
          englishName: product.englishName,
          slug: product.slug,
          shortDesc: product.shortDesc,
          primaryImage,

          brand: product.brand
            ? {
                id: product.brand.id,
                name: product.brand.name,
                slug: product.brand.slug,
                logo: product.brand.logo,
              }
            : null,

          category: product.category
            ? {
                id: product.category.id,
                name: product.category.name,
                slug: product.category.slug,
                image: product.category.image,
              }
            : null,
        },

        variant: {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          volume: variant.volume,
          barcode: variant.barcode,
          stock: variant.stock,
          isActive: variant.isActive,
          isInStock: variant.stock > 0,
        },

        price: priceInfo,

        totals: {
          lineOriginalTotal,
          lineFinalTotal,
          lineDiscountTotal,
        },

        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    const totalQuantity = items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const originalTotal = items.reduce(
      (sum, item) => sum + item.totals.lineOriginalTotal,
      0,
    );

    const finalTotal = items.reduce(
      (sum, item) => sum + item.totals.lineFinalTotal,
      0,
    );

    const discountTotal = items.reduce(
      (sum, item) => sum + item.totals.lineDiscountTotal,
      0,
    );

    return {
      id: cart.id,
      userId: cart.userId,

      items,

      summary: {
        itemCount: items.length,
        totalQuantity,
        originalTotal,
        discountTotal,
        finalTotal,
        payableTotal: finalTotal,
      },

      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  async getCart(userId: number) {
    const cart = await this.getOrCreateCartWithItems(userId);

    return this.formatCart(cart);
  }

  async addToCart(userId: number, variantId: number, quantity = 1) {
    if (quantity <= 0) {
      throw new BadRequestException('تعداد محصول باید بیشتر از صفر باشد');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: {
        id: variantId,
      },
      include: {
        product: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('تنوع محصول پیدا نشد');
    }

    if (!variant.isActive || !variant.product.isActive) {
      throw new BadRequestException('این محصول فعال نیست');
    }

    if (variant.stock <= 0) {
      throw new BadRequestException('این محصول موجود نیست');
    }

    const cart = await this.getOrCreateCartBase(userId);

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    const finalQuantity = existing
      ? existing.quantity + quantity
      : quantity;

    if (variant.stock < finalQuantity) {
      throw new BadRequestException(
        `موجودی کافی نیست. موجودی فعلی: ${variant.stock}`,
      );
    }

    if (existing) {
      await this.prisma.cartItem.update({
        where: {
          id: existing.id,
        },
        data: {
          quantity: finalQuantity,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: variant.productId,
          variantId,
          quantity,
        },
      });
    }

    const updatedCart = await this.getOrCreateCartWithItems(userId);

    return {
      message: 'محصول به سبد خرید اضافه شد',
      cart: this.formatCart(updatedCart),
    };
  }

  async updateQuantity(userId: number, itemId: number, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('تعداد محصول باید بیشتر از صفر باشد');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
        },
      },
      include: {
        variant: true,
      },
    });

    if (!item) {
      throw new NotFoundException('آیتم سبد خرید پیدا نشد');
    }

    if (!item.variant.isActive) {
      throw new BadRequestException('این تنوع محصول فعال نیست');
    }

    if (item.variant.stock < quantity) {
      throw new BadRequestException(
        `موجودی کافی نیست. موجودی فعلی: ${item.variant.stock}`,
      );
    }

    await this.prisma.cartItem.update({
      where: {
        id: item.id,
      },
      data: {
        quantity,
      },
    });

    const updatedCart = await this.getOrCreateCartWithItems(userId);

    return {
      message: 'تعداد محصول در سبد خرید آپدیت شد',
      cart: this.formatCart(updatedCart),
    };
  }

  async removeItem(userId: number, itemId: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('آیتم سبد خرید پیدا نشد');
    }

    await this.prisma.cartItem.delete({
      where: {
        id: item.id,
      },
    });

    const updatedCart = await this.getOrCreateCartWithItems(userId);

    return {
      message: 'محصول از سبد خرید حذف شد',
      cart: this.formatCart(updatedCart),
    };
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      const newCart = await this.getOrCreateCartWithItems(userId);

      return {
        message: 'سبد خرید خالی است',
        cart: this.formatCart(newCart),
      };
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    const updatedCart = await this.getOrCreateCartWithItems(userId);

    return {
      message: 'سبد خرید خالی شد',
      cart: this.formatCart(updatedCart),
    };
  }

  private async getOrCreateCartBase(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
        },
      });
    }

    return cart;
  }

  private async getOrCreateCartWithItems(
    userId: number,
  ): Promise<CartWithItems> {
    let cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      include: cartWithItemsInclude,
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
        },
        include: cartWithItemsInclude,
      });
    }

    return cart;
  }
}