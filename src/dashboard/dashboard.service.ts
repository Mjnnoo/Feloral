import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    const revenueStatuses: OrderStatus[] = [
      OrderStatus.paid,
      OrderStatus.processing,
      OrderStatus.shipped,
      OrderStatus.delivered,
    ];

    const [
      usersCount,
      productsCount,
      activeProductsCount,
      variantsCount,
      lowStockVariantsCount,
      ordersCount,

      todayOrdersCount,
      monthOrdersCount,

      pendingOrdersCount,
      paidOrdersCount,
      processingOrdersCount,
      shippedOrdersCount,
      deliveredOrdersCount,
      canceledOrdersCount,
      refundedOrdersCount,
      failedOrdersCount,

      revenueAggregate,
      todayRevenueAggregate,
      monthRevenueAggregate,

      paidRevenueAggregate,
      processingRevenueAggregate,
      shippedRevenueAggregate,
      deliveredRevenueAggregate,

      recentOrders,
      lowStockVariants,
    ] = await Promise.all([
      this.prisma.user.count(),

      this.prisma.product.count(),

      this.prisma.product.count({
        where: {
          isActive: true,
        },
      }),

      this.prisma.productVariant.count(),

      this.prisma.productVariant.count({
        where: {
          stock: {
            lte: 5,
          },
        },
      }),

      this.prisma.order.count(),

      this.prisma.order.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      this.prisma.order.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),

      this.prisma.order.count({
        where: {
          status: OrderStatus.pending,
        },
      }),

      this.prisma.order.count({
        where: {
          status: OrderStatus.paid,
        },
      }),

      this.prisma.order.count({
        where: {
          status: OrderStatus.processing,
        },
      }),

      this.prisma.order.count({
        where: {
          status: OrderStatus.shipped,
        },
      }),

      this.prisma.order.count({
        where: {
          status: OrderStatus.delivered,
        },
      }),

      this.prisma.order.count({
        where: {
          status: OrderStatus.canceled,
        },
      }),

      this.prisma.order.count({
        where: {
          status: OrderStatus.refunded,
        },
      }),

      this.prisma.order.count({
        where: {
          status: OrderStatus.failed,
        },
      }),

      this.prisma.order.aggregate({
        where: {
          status: {
            in: revenueStatuses,
          },
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.order.aggregate({
        where: {
          status: {
            in: revenueStatuses,
          },
          createdAt: {
            gte: startOfToday,
          },
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.order.aggregate({
        where: {
          status: {
            in: revenueStatuses,
          },
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.paid,
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.processing,
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.shipped,
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.delivered,
        },
        _sum: {
          total: true,
        },
      }),

      this.prisma.order.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          userId: true,
          status: true,
          total: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              email: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),

      this.prisma.productVariant.findMany({
        where: {
          stock: {
            lte: 5,
          },
        },
        take: 10,
        orderBy: {
          stock: 'asc',
        },
        select: {
          id: true,
          title: true,
          sku: true,
          stock: true,
          price: true,
          salePrice: true,
          isActive: true,
          product: {
            select: {
              id: true,
              name: true,
              englishName: true,
              slug: true,
              brand: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              images: {
                orderBy: [
                  { isPrimary: 'desc' },
                  { sortOrder: 'asc' },
                  { id: 'asc' },
                ],
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    return {
      overview: {
        usersCount,
        productsCount,
        activeProductsCount,
        variantsCount,
        lowStockVariantsCount,
        ordersCount,
        totalRevenue: Number(revenueAggregate._sum.total ?? 0),
      },

      today: {
        ordersCount: todayOrdersCount,
        revenue: Number(todayRevenueAggregate._sum.total ?? 0),
      },

      month: {
        ordersCount: monthOrdersCount,
        revenue: Number(monthRevenueAggregate._sum.total ?? 0),
      },

      orders: {
        pending: pendingOrdersCount,
        paid: paidOrdersCount,
        processing: processingOrdersCount,
        shipped: shippedOrdersCount,
        delivered: deliveredOrdersCount,
        canceled: canceledOrdersCount,
        refunded: refundedOrdersCount,
        failed: failedOrdersCount,
      },

      revenueByStatus: {
        paid: Number(paidRevenueAggregate._sum.total ?? 0),
        processing: Number(processingRevenueAggregate._sum.total ?? 0),
        shipped: Number(shippedRevenueAggregate._sum.total ?? 0),
        delivered: Number(deliveredRevenueAggregate._sum.total ?? 0),
      },

      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        userId: order.userId,
        user: order.user,
        status: order.status,
        total: Number(order.total),
        itemsCount: order._count.items,
        createdAt: order.createdAt,
      })),

      lowStockVariants: lowStockVariants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        stock: variant.stock,
        price: Number(variant.price),
        salePrice:
          variant.salePrice !== null && variant.salePrice !== undefined
            ? Number(variant.salePrice)
            : null,
        isActive: variant.isActive,
        product: {
          id: variant.product.id,
          name: variant.product.name,
          englishName: variant.product.englishName,
          slug: variant.product.slug,
          image: variant.product.images[0] ?? null,
          brand: variant.product.brand,
          category: variant.product.category,
        },
      })),
    };
  }
}