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

  async getCart(userId: number) {
    const cart = await this.getOrCreateCartWithItems(userId);

    let total = 0;
    let itemCount = 0;

    const items = cart.items.map((item) => {
      const variant = item.variant;
      const product = variant.product;

      const unitPrice =
        variant.salePrice !== null && variant.salePrice !== undefined
          ? Number(variant.salePrice)
          : Number(variant.price);

      const lineTotal = unitPrice * item.quantity;

      total += lineTotal;
      itemCount += item.quantity;

      const primaryImage =
        product.images.find((image) => image.isPrimary) ??
        product.images[0] ??
        null;

      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        variant: {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          volume: variant.volume,
          barcode: variant.barcode,
          price: Number(variant.price),
          salePrice:
            variant.salePrice !== null && variant.salePrice !== undefined
              ? Number(variant.salePrice)
              : null,
          stock: variant.stock,
          isActive: variant.isActive,
        },
        product: {
          id: product.id,
          name: product.name,
          englishName: product.englishName,
          slug: product.slug,
          shortDesc: product.shortDesc,
          image: primaryImage,
          brand: product.brand,
          category: product.category,
        },
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      total,
      itemCount,
    };
  }

  async addToCart(userId: number, variantId: number, quantity = 1) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (!variant.isActive || !variant.product.isActive) {
      throw new BadRequestException('Product is not active');
    }

    const cart = await this.getOrCreateCartBase(userId);

    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        variantId,
      },
    });

    const finalQuantity = existing
      ? existing.quantity + quantity
      : quantity;

    if (variant.stock < finalQuantity) {
      throw new BadRequestException('Not enough stock');
    }

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: finalQuantity,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateQuantity(
    userId: number,
    itemId: number,
    quantity: number,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
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
      throw new NotFoundException('Cart item not found');
    }

    if (item.variant.stock < quantity) {
      throw new BadRequestException('Not enough stock');
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return this.getCart(userId);
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
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: item.id },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return {
        message: 'Cart already empty',
      };
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(userId);
  }

  private async getOrCreateCartBase(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    return cart;
  }

  private async getOrCreateCartWithItems(
    userId: number,
  ): Promise<CartWithItems> {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: cartWithItemsInclude,
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: cartWithItemsInclude,
      });
    }

    return cart;
  }
}