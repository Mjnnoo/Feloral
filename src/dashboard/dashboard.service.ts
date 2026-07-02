import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(
    value: unknown,
    fallback: number,
    min?: number,
    max?: number,
  ): number {
    const number = Number(value);

    if (Number.isNaN(number) || number <= 0) {
      return fallback;
    }

    if (min !== undefined && number < min) {
      return min;
    }

    if (max !== undefined && number > max) {
      return max;
    }

    return number;
  }

  private getStartOfToday() {
    const now = new Date();
    const startOfToday = new Date(now);

    startOfToday.setHours(0, 0, 0, 0);

    return startOfToday;
  }

  private getStartOfMonth() {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private getRevenueStatuses(): OrderStatus[] {
    return [
      OrderStatus.paid,
      OrderStatus.processing,
      OrderStatus.shipped,
      OrderStatus.delivered,
    ];
  }

  private toMoney(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }

  private getDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private formatRecentOrder(order: any) {
    return {
      id: order.id,
      userId: order.userId,

      user: order.user
        ? {
            id: order.user.id,
            fullName: order.user.fullName,
            mobile: order.user.mobile,
            email: order.user.email,
          }
        : null,

      status: order.status,
      total: Number(order.total),
      itemsCount: order._count?.items ?? 0,

      shipping: {
        receiverName: order.shippingReceiverName,
        receiverMobile: order.shippingReceiverMobile,
        province: order.shippingProvince,
        city: order.shippingCity,
      },

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private formatLowStockVariant(variant: any) {
    const primaryImage = variant.product?.images?.[0] ?? null;

    return {
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      volume: variant.volume,
      barcode: variant.barcode,
      stock: variant.stock,
      isActive: variant.isActive,

      price: Number(variant.price),
      salePrice:
        variant.salePrice !== null && variant.salePrice !== undefined
          ? Number(variant.salePrice)
          : null,

      product: variant.product
        ? {
            id: variant.product.id,
            name: variant.product.name,
            englishName: variant.product.englishName,
            slug: variant.product.slug,
            image: primaryImage,

            brand: variant.product.brand
              ? {
                  id: variant.product.brand.id,
                  name: variant.product.brand.name,
                  slug: variant.product.brand.slug,
                }
              : null,

            category: variant.product.category
              ? {
                  id: variant.product.category.id,
                  name: variant.product.category.name,
                  slug: variant.product.category.slug,
                }
              : null,
          }
        : null,
    };
  }

  async getAdminSummary() {
    const startOfToday = this.getStartOfToday();
    const startOfMonth = this.getStartOfMonth();
    const revenueStatuses = this.getRevenueStatuses();

    const [
      usersCount,
      activeUsersCount,

      brandsCount,
      categoriesCount,

      productsCount,
      activeProductsCount,
      variantsCount,
      activeVariantsCount,
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
      averageOrderAggregate,

      paidRevenueAggregate,
      processingRevenueAggregate,
      shippedRevenueAggregate,
      deliveredRevenueAggregate,

      recentOrders,
      lowStockVariants,
    ] = await Promise.all([
      this.prisma.user.count(),

      this.prisma.user.count({
        where: {
          isActive: true,
        },
      }),

      this.prisma.brand.count(),

      this.prisma.category.count(),

      this.prisma.product.count(),

      this.prisma.product.count({
        where: {
          isActive: true,
        },
      }),

      this.prisma.productVariant.count(),

      this.prisma.productVariant.count({
        where: {
          isActive: true,
        },
      }),

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
          status: {
            in: revenueStatuses,
          },
        },
        _avg: {
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
        take: 8,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          userId: true,
          status: true,
          total: true,

          shippingReceiverName: true,
          shippingReceiverMobile: true,
          shippingProvince: true,
          shippingCity: true,

          createdAt: true,
          updatedAt: true,

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
          volume: true,
          barcode: true,
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
                  {
                    isPrimary: 'desc',
                  },
                  {
                    sortOrder: 'asc',
                  },
                  {
                    id: 'asc',
                  },
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
        activeUsersCount,

        brandsCount,
        categoriesCount,

        productsCount,
        activeProductsCount,
        variantsCount,
        activeVariantsCount,
        lowStockVariantsCount,

        ordersCount,
      },

      revenue: {
        totalRevenue: this.toMoney(revenueAggregate._sum.total),
        todayRevenue: this.toMoney(todayRevenueAggregate._sum.total),
        monthRevenue: this.toMoney(monthRevenueAggregate._sum.total),
        averageOrderValue: this.toMoney(averageOrderAggregate._avg.total),

        byStatus: {
          paid: this.toMoney(paidRevenueAggregate._sum.total),
          processing: this.toMoney(processingRevenueAggregate._sum.total),
          shipped: this.toMoney(shippedRevenueAggregate._sum.total),
          delivered: this.toMoney(deliveredRevenueAggregate._sum.total),
        },

        revenueStatuses,
      },

      today: {
        ordersCount: todayOrdersCount,
        revenue: this.toMoney(todayRevenueAggregate._sum.total),
      },

      month: {
        ordersCount: monthOrdersCount,
        revenue: this.toMoney(monthRevenueAggregate._sum.total),
      },

      orders: {
        total: ordersCount,
        pending: pendingOrdersCount,
        paid: paidOrdersCount,
        processing: processingOrdersCount,
        shipped: shippedOrdersCount,
        delivered: deliveredOrdersCount,
        canceled: canceledOrdersCount,
        refunded: refundedOrdersCount,
        failed: failedOrdersCount,
      },

      recentOrders: recentOrders.map((order) => this.formatRecentOrder(order)),

      lowStockVariants: lowStockVariants.map((variant) =>
        this.formatLowStockVariant(variant),
      ),
    };
  }

  async getSalesStats(daysValue?: string) {
    const days = this.toNumber(daysValue, 7, 1, 90);
    const revenueStatuses = this.getRevenueStatuses();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
      },
    });

    const salesMap = new Map<
      string,
      {
        date: string;
        ordersCount: number;
        revenueOrdersCount: number;
        revenue: number;
        pendingOrdersCount: number;
        paidOrdersCount: number;
        failedOrdersCount: number;
      }
    >();

    for (let index = 0; index < days; index++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);

      const key = this.getDateKey(date);

      salesMap.set(key, {
        date: key,
        ordersCount: 0,
        revenueOrdersCount: 0,
        revenue: 0,
        pendingOrdersCount: 0,
        paidOrdersCount: 0,
        failedOrdersCount: 0,
      });
    }

    for (const order of orders) {
      const key = this.getDateKey(order.createdAt);
      const row = salesMap.get(key);

      if (!row) {
        continue;
      }

      row.ordersCount += 1;

      if (revenueStatuses.includes(order.status)) {
        row.revenueOrdersCount += 1;
        row.revenue += Number(order.total);
      }

      if (order.status === OrderStatus.pending) {
        row.pendingOrdersCount += 1;
      }

      if (order.status === OrderStatus.paid) {
        row.paidOrdersCount += 1;
      }

      if (order.status === OrderStatus.failed) {
        row.failedOrdersCount += 1;
      }
    }

    const data = Array.from(salesMap.values());

    return {
      days,
      from: this.getDateKey(startDate),
      to: this.getDateKey(new Date()),
      revenueStatuses,
      data,
      summary: {
        ordersCount: data.reduce((sum, item) => sum + item.ordersCount, 0),
        revenueOrdersCount: data.reduce(
          (sum, item) => sum + item.revenueOrdersCount,
          0,
        ),
        revenue: data.reduce((sum, item) => sum + item.revenue, 0),
      },
    };
  }

  async getLatestOrders(limitValue?: string) {
    const limit = this.toNumber(limitValue, 10, 1, 50);

    const orders = await this.prisma.order.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        userId: true,
        status: true,
        total: true,

        shippingReceiverName: true,
        shippingReceiverMobile: true,
        shippingProvince: true,
        shippingCity: true,

        createdAt: true,
        updatedAt: true,

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
    });

    return {
      data: orders.map((order) => this.formatRecentOrder(order)),
      meta: {
        total: orders.length,
        limit,
      },
    };
  }

  async getLowStock(thresholdValue?: string, limitValue?: string) {
    const threshold = this.toNumber(thresholdValue, 5, 0, 1000);
    const limit = this.toNumber(limitValue, 20, 1, 100);

    const variants = await this.prisma.productVariant.findMany({
      where: {
        stock: {
          lte: threshold,
        },
      },
      take: limit,
      orderBy: {
        stock: 'asc',
      },
      select: {
        id: true,
        title: true,
        sku: true,
        volume: true,
        barcode: true,
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
                {
                  isPrimary: 'desc',
                },
                {
                  sortOrder: 'asc',
                },
                {
                  id: 'asc',
                },
              ],
              take: 1,
            },
          },
        },
      },
    });

    return {
      data: variants.map((variant) => this.formatLowStockVariant(variant)),
      meta: {
        threshold,
        limit,
        total: variants.length,
      },
    };
  }
}