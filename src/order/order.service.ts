import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: number, data: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
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
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const address = data.addressId
        ? await tx.address.findFirst({
            where: {
              id: data.addressId,
              userId,
              isActive: true,
            },
          })
        : await tx.address.findFirst({
            where: {
              userId,
              isActive: true,
              isDefault: true,
            },
          });

      if (!address) {
        throw new BadRequestException('Valid address is required');
      }

      for (const item of cart.items) {
        if (!item.variant.isActive || !item.variant.product.isActive) {
          throw new BadRequestException(
            `Product variant ${item.variantId} is not active`,
          );
        }

        if (item.variant.stock < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for variant ${item.variantId}`,
          );
        }
      }

      const orderItems = cart.items.map((item) => {
        const unitPrice =
          item.variant.salePrice !== null &&
          item.variant.salePrice !== undefined
            ? Number(item.variant.salePrice)
            : Number(item.variant.price);

        return {
          variantId: item.variantId,
          quantity: item.quantity,
          price: unitPrice,
          lineTotal: unitPrice * item.quantity,
        };
      });

      const total = orderItems.reduce(
        (sum, item) => sum + item.lineTotal,
        0,
      );

      const order = await tx.order.create({
        data: {
          userId,
          addressId: address.id,

          total,
          status: OrderStatus.pending,

          shippingReceiverName: address.receiverName,
          shippingReceiverMobile: address.receiverMobile,
          shippingProvince: address.province,
          shippingCity: address.city,
          shippingAddressLine: address.addressLine,
          shippingPostalCode: address.postalCode,
          shippingPlaque: address.plaque,
          shippingUnit: address.unit,

          items: {
            create: orderItems.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        select: this.orderSelect(),
      });

      for (const item of cart.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return this.formatOrder(order);
    });
  }

  async getOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      select: this.orderSelect(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((order) => this.formatOrder(order));
  }

  async getOrderById(id: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        userId,
      },
      select: this.orderSelect(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrder(order);
  }

  async getAllOrdersForAdmin() {
    try {
      const orders = await this.prisma.order.findMany({
        select: this.adminOrderSelect(),
        orderBy: {
          createdAt: 'desc',
        },
      });

      return orders.map((order) => this.formatOrder(order));
    } catch (error) {
      console.error('GET_ALL_ORDERS_FOR_ADMIN_ERROR:', error);

      throw new InternalServerErrorException(
        'Failed to get admin orders',
      );
    }
  }

  async getOrderByIdForAdmin(id: number) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
        select: this.adminOrderSelect(),
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      return this.formatOrder(order);
    } catch (error) {
      console.error('GET_ORDER_BY_ID_FOR_ADMIN_ERROR:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to get admin order',
      );
    }
  }

  async updateOrderStatus(id: number, status: OrderStatus) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      await this.prisma.order.update({
        where: { id },
        data: {
          status,
        },
      });

      return this.getOrderByIdForAdmin(id);
    } catch (error) {
      console.error('UPDATE_ORDER_STATUS_ERROR:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to update order status',
      );
    }
  }

  private orderSelect() {
    return {
      id: true,
      userId: true,
      addressId: true,
      status: true,
      total: true,
      authority: true,

      shippingReceiverName: true,
      shippingReceiverMobile: true,
      shippingProvince: true,
      shippingCity: true,
      shippingAddressLine: true,
      shippingPostalCode: true,
      shippingPlaque: true,
      shippingUnit: true,

      createdAt: true,
      updatedAt: true,

      address: true,

      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          variant: {
            select: {
              id: true,
              title: true,
              sku: true,
              volume: true,
              barcode: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  englishName: true,
                  slug: true,
                  brand: true,
                  category: true,
                  images: {
                    orderBy: [
                      { isPrimary: 'desc' as const },
                      { sortOrder: 'asc' as const },
                      { id: 'asc' as const },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private adminOrderSelect() {
    return {
      ...this.orderSelect(),
      user: {
        select: {
          id: true,
          fullName: true,
          mobile: true,
          email: true,
          role: true,
        },
      },
    };
  }

  private formatOrder(order: any) {
    const items = order.items.map((item) => {
      const variant = item.variant;
      const product = variant?.product;

      const primaryImage =
        product?.images?.find((image) => image.isPrimary) ??
        product?.images?.[0] ??
        null;

      const unitPrice = Number(item.price);
      const lineTotal = unitPrice * item.quantity;

      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        variant: variant
          ? {
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
              volume: variant.volume,
              barcode: variant.barcode,
            }
          : null,
        product: product
          ? {
              id: product.id,
              name: product.name,
              englishName: product.englishName,
              slug: product.slug,
              image: primaryImage,
              brand: product.brand,
              category: product.category,
            }
          : null,
      };
    });

    return {
      id: order.id,
      userId: order.userId,
      user: order.user ?? undefined,

      addressId: order.addressId,
      address: order.address ?? null,

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

      status: order.status,
      total: Number(order.total),
      itemCount: items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      items,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}