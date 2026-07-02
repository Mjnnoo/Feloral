import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/enums/role.enum';

import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

type UserListQuery = {
  page?: string;
  limit?: string;
  search?: string;
  role?: string;
  isActive?: string;
};

type CustomerListQuery = {
  page?: string;
  limit?: string;
  search?: string;
  isActive?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(
    value: unknown,
    fallback: number,
    min?: number,
    max?: number,
  ) {
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

  private parseBoolean(value?: string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    throw new BadRequestException('مقدار isActive باید true یا false باشد');
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      fullName: user.fullName,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private formatUserWithStats(user: any) {
    const orders = user.orders ?? [];
    const paidStatuses = ['paid', 'processing', 'shipped', 'delivered'];

    const totalOrders = orders.length;
    const paidOrders = orders.filter((order) =>
      paidStatuses.includes(order.status),
    );

    const totalSpent = paidOrders.reduce((sum, order) => {
      return sum + Number(order.total);
    }, 0);

    return {
      ...this.formatUser(user),

      stats: {
        addressesCount: user._count?.addresses ?? 0,
        ordersCount: user._count?.orders ?? totalOrders,
        paidOrdersCount: paidOrders.length,
        totalSpent,
      },
    };
  }

  private async findUserOrFail(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر پیدا نشد');
    }

    return user;
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        addresses: {
          where: {
            isActive: true,
          },
          orderBy: [
            {
              isDefault: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر پیدا نشد');
    }

    return {
      user: this.formatUser(user),
      addresses: user.addresses,
      stats: {
        ordersCount: user._count.orders,
        addressesCount: user._count.addresses,
      },
    };
  }

  async getCustomers(query: CustomerListQuery) {
    const page = this.toNumber(query.page, 1, 1, 100000);
    const limit = this.toNumber(query.limit, 20, 1, 100);
    const skip = (page - 1) * limit;

    const isActive = this.parseBoolean(query.isActive);
    const search = query.search?.trim();

    const where: any = {
      role: Role.CUSTOMER,
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        {
          fullName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          mobile: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [total, customers] = await Promise.all([
      this.prisma.user.count({
        where,
      }),

      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          orders: {
            select: {
              id: true,
              status: true,
              total: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              orders: true,
              addresses: true,
            },
          },
        },
      }),
    ]);

    return {
      data: customers.map((customer) => this.formatUserWithStats(customer)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomerDetails(id: number) {
    const customer = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.CUSTOMER,
      },
      include: {
        addresses: {
          where: {
            isActive: true,
          },
          orderBy: [
            {
              isDefault: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
        },
        orders: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            status: true,
            total: true,
            authority: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                items: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('مشتری پیدا نشد');
    }

    const paidStatuses = ['paid', 'processing', 'shipped', 'delivered'];

    const totalSpent = customer.orders
      .filter((order) => paidStatuses.includes(order.status))
      .reduce((sum, order) => sum + Number(order.total), 0);

    return {
      customer: this.formatUser(customer),

      stats: {
        ordersCount: customer._count.orders,
        addressesCount: customer._count.addresses,
        recentOrdersCount: customer.orders.length,
        totalSpent,
      },

      addresses: customer.addresses,

      recentOrders: customer.orders.map((order) => ({
        id: order.id,
        status: order.status,
        total: Number(order.total),
        authority: order.authority,
        itemsCount: order._count.items,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    };
  }

  async getUsers(query: UserListQuery) {
    const page = this.toNumber(query.page, 1, 1, 100000);
    const limit = this.toNumber(query.limit, 20, 1, 100);
    const skip = (page - 1) * limit;

    const isActive = this.parseBoolean(query.isActive);
    const search = query.search?.trim();
    const role = query.role?.trim();

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (role) {
      const validRoles = Object.values(Role) as string[];

      if (!validRoles.includes(role)) {
        throw new BadRequestException('نقش واردشده معتبر نیست');
      }

      where.role = role;
    }

    if (search) {
      where.OR = [
        {
          fullName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          mobile: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({
        where,
      }),

      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          _count: {
            select: {
              orders: true,
              addresses: true,
            },
          },
        },
      }),
    ]);

    return {
      data: users.map((user) => ({
        ...this.formatUser(user),
        stats: {
          ordersCount: user._count.orders,
          addressesCount: user._count.addresses,
        },
      })),

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetails(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        addresses: {
          where: {
            isActive: true,
          },
          orderBy: [
            {
              isDefault: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
        },
        orders: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            status: true,
            total: true,
            authority: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                items: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر پیدا نشد');
    }

    return {
      user: this.formatUser(user),

      stats: {
        ordersCount: user._count.orders,
        addressesCount: user._count.addresses,
      },

      addresses: user.addresses,

      recentOrders: user.orders.map((order) => ({
        id: order.id,
        status: order.status,
        total: Number(order.total),
        authority: order.authority,
        itemsCount: order._count.items,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    };
  }

  async updateUserStatus(id: number, dto: UpdateUserStatusDto) {
    await this.findUserOrFail(id);

    const user = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive: dto.isActive,
      },
    });

    return {
      message: dto.isActive
        ? 'کاربر با موفقیت فعال شد'
        : 'کاربر با موفقیت غیرفعال شد',
      user: this.formatUser(user),
    };
  }

  async updateUserRole(id: number, dto: UpdateUserRoleDto) {
    await this.findUserOrFail(id);

    const user = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        role: dto.role,
      },
    });

    return {
      message: 'نقش کاربر با موفقیت تغییر کرد',
      user: this.formatUser(user),
    };
  }
}