import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class OrderService {
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

  private formatOrder(order: any) {
    const items =
      order.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,

        productName: item.productName,
        variantTitle: item.variantTitle,
        sku: item.sku,

        price: Number(item.price),
        quantity: item.quantity,
        total: Number(item.total),

        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              englishName: item.product.englishName,
              slug: item.product.slug,
              shortDesc: item.product.shortDesc,
            }
          : null,

        variant: item.variant
          ? {
              id: item.variant.id,
              title: item.variant.title,
              sku: item.variant.sku,
              volume: item.variant.volume,
              barcode: item.variant.barcode,
            }
          : null,

        createdAt: item.createdAt,
      })) || [];

    return {
      id: order.id,
      userId: order.userId,
      addressId: order.addressId,

      status: order.status,
      total: Number(order.total),

      authority: order.authority,

      shipping: {
        receiverName: order.shippingReceiverName,
        receiverMobile: order.shippingReceiverMobile,
        province: order.shippingProvince,
        city: order.shippingCity,
        addressLine: order.shippingAddressLine,
        postalCode: order.shippingPostalCode,
        plaque: order.shippingPlaque,
        unit: order.shippingUnit,
      },

      items,

      summary: {
        itemCount: items.length,
        totalQuantity: items.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        ),
        total: Number(order.total),
      },

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private getOrderInclude() {
    return {
      items: {
        orderBy: {
          id: 'asc' as const,
        },
        include: {
          product: true,
          variant: true,
        },
      },
      address: true,
    };
  }

  async checkout(userId: number, dto: CheckoutDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: {
          userId,
        },
        include: {
          items: {
            orderBy: {
              id: 'asc',
            },
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!cart || !cart.items.length) {
        throw new BadRequestException('سبد خرید خالی است');
      }

      let addressSnapshot: {
        addressId: number | null;
        shippingReceiverName: string | null;
        shippingReceiverMobile: string | null;
        shippingProvince: string | null;
        shippingCity: string | null;
        shippingAddressLine: string | null;
        shippingPostalCode: string | null;
        shippingPlaque: string | null;
        shippingUnit: string | null;
      } = {
        addressId: null,
        shippingReceiverName: dto.shippingReceiverName?.trim() || null,
        shippingReceiverMobile: dto.shippingReceiverMobile?.trim() || null,
        shippingProvince: dto.shippingProvince?.trim() || null,
        shippingCity: dto.shippingCity?.trim() || null,
        shippingAddressLine: dto.shippingAddressLine?.trim() || null,
        shippingPostalCode: dto.shippingPostalCode?.trim() || null,
        shippingPlaque: dto.shippingPlaque?.trim() || null,
        shippingUnit: dto.shippingUnit?.trim() || null,
      };

      if (dto.addressId) {
        const address = await tx.address.findFirst({
          where: {
            id: dto.addressId,
            userId,
            isActive: true,
          },
        });

        if (!address) {
          throw new NotFoundException('آدرس انتخاب‌شده پیدا نشد');
        }

        addressSnapshot = {
          addressId: address.id,
          shippingReceiverName: address.receiverName,
          shippingReceiverMobile: address.receiverMobile,
          shippingProvince: address.province,
          shippingCity: address.city,
          shippingAddressLine: address.addressLine,
          shippingPostalCode: address.postalCode,
          shippingPlaque: address.plaque,
          shippingUnit: address.unit,
        };
      }

      const orderItemsData: Prisma.OrderItemCreateWithoutOrderInput[] = [];
      let orderTotal = 0;

      for (const cartItem of cart.items) {
        const variant = cartItem.variant;
        const product = variant.product;

        if (!product || !product.isActive) {
          throw new BadRequestException(
            `محصول ${product?.name || ''} فعال نیست`,
          );
        }

        if (!variant.isActive) {
          throw new BadRequestException(
            `تنوع ${variant.title} فعال نیست`,
          );
        }

        if (variant.stock < cartItem.quantity) {
          throw new BadRequestException(
            `موجودی محصول ${product.name} کافی نیست. موجودی فعلی: ${variant.stock}`,
          );
        }

        const priceInfo = this.getFinalPrice(variant.price, variant.salePrice);
        const lineTotal = priceInfo.finalPrice * cartItem.quantity;
        orderTotal += lineTotal;

        orderItemsData.push({
          product: {
            connect: {
              id: product.id,
            },
          },
          variant: {
            connect: {
              id: variant.id,
            },
          },
          productName: product.name,
          variantTitle: variant.title,
          sku: variant.sku,
          price: new Prisma.Decimal(priceInfo.finalPrice),
          quantity: cartItem.quantity,
          total: new Prisma.Decimal(lineTotal),
        });
      }

      const order = await tx.order.create({
        data: {
          user: {
            connect: {
              id: userId,
            },
          },
          address: addressSnapshot.addressId
            ? {
                connect: {
                  id: addressSnapshot.addressId,
                },
              }
            : undefined,

          status: OrderStatus.pending,
          total: new Prisma.Decimal(orderTotal),

          shippingReceiverName: addressSnapshot.shippingReceiverName,
          shippingReceiverMobile: addressSnapshot.shippingReceiverMobile,
          shippingProvince: addressSnapshot.shippingProvince,
          shippingCity: addressSnapshot.shippingCity,
          shippingAddressLine: addressSnapshot.shippingAddressLine,
          shippingPostalCode: addressSnapshot.shippingPostalCode,
          shippingPlaque: addressSnapshot.shippingPlaque,
          shippingUnit: addressSnapshot.shippingUnit,

          items: {
            create: orderItemsData,
          },
        },
      });

      for (const cartItem of cart.items) {
        const stockUpdate = await tx.productVariant.updateMany({
          where: {
            id: cartItem.variantId,
            isActive: true,
            stock: {
              gte: cartItem.quantity,
            },
          },
          data: {
            stock: {
              decrement: cartItem.quantity,
            },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new BadRequestException(
            `موجودی یکی از محصولات برای ثبت سفارش کافی نیست`,
          );
        }
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      const fullOrder = await tx.order.findUnique({
        where: {
          id: order.id,
        },
        include: this.getOrderInclude(),
      });

      if (!fullOrder) {
        throw new NotFoundException('سفارش ساخته شد اما پیدا نشد');
      }

      return fullOrder;
    });

    return {
      message: 'سفارش با موفقیت ثبت شد',
      order: this.formatOrder(result),
    };
  }

  async getMyOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: this.getOrderInclude(),
    });

    return {
      data: orders.map((order) => this.formatOrder(order)),
      meta: {
        total: orders.length,
      },
    };
  }

  async getMyOrderById(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: this.getOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException('سفارش پیدا نشد');
    }

    return this.formatOrder(order);
  }
}