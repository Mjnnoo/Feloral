import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import {
  normalizeUserRole,
  USER_ROLE_PRIORITY,
  type UserRole,
} from '../auth/constants/roles';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SAFE_USER_SELECT = {
  id: true,
  fullName: true,
  mobile: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type ManagedUser = Prisma.UserGetPayload<{
  select: typeof SAFE_USER_SELECT;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateUserDto) {
    const role = normalizeUserRole(dto.role ?? 'customer');

    if (!role) throw new ConflictException('نقش کاربر معتبر نیست');

    this.assertCanAssignRole(actor, role);

    const password = await bcrypt.hash(dto.password, 10);

    try {
      return await this.prisma.user.create({
        data: {
          fullName: this.cleanNullableText(dto.fullName),
          mobile: dto.mobile.trim(),
          email: this.cleanEmail(dto.email),
          password,
          role,
          isActive: dto.isActive ?? true,
        },
        select: SAFE_USER_SELECT,
      });
    } catch (error: unknown) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  async findAll(query: QueryUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined
        ? { isActive: query.isActive }
        : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: number) {
    return this.findManagedUser(id);
  }

  async update(actor: AuthenticatedUser, id: number, dto: UpdateUserDto) {
    const target = await this.findManagedUser(id);
    const targetRole = this.requireRole(target.role);
    const requestedRole =
      dto.role !== undefined ? this.requireRole(dto.role) : undefined;

    this.assertCanManageTarget(actor, target);

    if (actor.id === target.id) {
      if (requestedRole && requestedRole !== targetRole) {
        throw new ForbiddenException('نمی‌توانید نقش حساب خودتان را تغییر دهید');
      }

      if (dto.isActive === false) {
        throw new ForbiddenException('نمی‌توانید حساب خودتان را غیرفعال کنید');
      }
    }

    if (requestedRole && requestedRole !== targetRole) {
      this.assertCanAssignRole(actor, requestedRole);
    }

    const nextRole = requestedRole ?? targetRole;
    const nextIsActive = dto.isActive ?? target.isActive;

    await this.ensureActiveSuperAdminRemains(
      target,
      nextRole,
      nextIsActive,
    );

    const data: Prisma.UserUpdateInput = {};

    if (dto.fullName !== undefined) {
      data.fullName = this.cleanNullableText(dto.fullName);
    }

    if (dto.mobile !== undefined) data.mobile = dto.mobile.trim();
    if (dto.email !== undefined) data.email = this.cleanEmail(dto.email);
    if (requestedRole !== undefined) data.role = requestedRole;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const securityChanged =
      dto.password !== undefined ||
      (requestedRole !== undefined && requestedRole !== targetRole) ||
      (dto.isActive !== undefined && dto.isActive !== target.isActive);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.update({
          where: { id },
          data,
          select: SAFE_USER_SELECT,
        });

        if (securityChanged) {
          await transaction.session.updateMany({
            where: {
              userId: id,
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
            },
          });
        }

        return user;
      });
    } catch (error: unknown) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  async deactivate(actor: AuthenticatedUser, id: number) {
    const target = await this.findManagedUser(id);

    if (actor.id === target.id) {
      throw new ForbiddenException('نمی‌توانید حساب خودتان را غیرفعال کنید');
    }

    this.assertCanManageTarget(actor, target);

    const targetRole = this.requireRole(target.role);

    await this.ensureActiveSuperAdminRemains(target, targetRole, false);

    if (!target.isActive) {
      return {
        message: 'حساب کاربر از قبل غیرفعال است',
        user: target,
      };
    }

    const user = await this.prisma.$transaction(async (transaction) => {
      const updatedUser = await transaction.user.update({
        where: { id },
        data: { isActive: false },
        select: SAFE_USER_SELECT,
      });

      await transaction.session.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return updatedUser;
    });

    return {
      message: 'حساب کاربر غیرفعال شد',
      user,
    };
  }

  private async findManagedUser(id: number): Promise<ManagedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });

    if (!user) throw new NotFoundException('کاربر پیدا نشد');

    return user;
  }

  private assertCanManageTarget(
    actor: AuthenticatedUser,
    target: ManagedUser,
  ) {
    const actorRole = this.requireRole(actor.role);
    const targetRole = this.requireRole(target.role);

    if (actorRole === 'super_admin') return;

    if (actorRole !== 'admin') {
      throw new ForbiddenException('اجازه مدیریت کاربران را ندارید');
    }

    if (USER_ROLE_PRIORITY[targetRole] >= USER_ROLE_PRIORITY.admin) {
      throw new ForbiddenException(
        'ادمین نمی‌تواند حساب ادمین یا مدیر ارشد را مدیریت کند',
      );
    }
  }

  private assertCanAssignRole(actor: AuthenticatedUser, role: UserRole) {
    const actorRole = this.requireRole(actor.role);

    if (actorRole === 'super_admin') return;

    if (
      actorRole !== 'admin' ||
      USER_ROLE_PRIORITY[role] >= USER_ROLE_PRIORITY.admin
    ) {
      throw new ForbiddenException('اجازه تعیین این نقش را ندارید');
    }
  }

  private async ensureActiveSuperAdminRemains(
    target: ManagedUser,
    nextRole: UserRole,
    nextIsActive: boolean,
  ) {
    const targetRole = this.requireRole(target.role);

    if (
      targetRole !== 'super_admin' ||
      !target.isActive ||
      (nextRole === 'super_admin' && nextIsActive)
    ) {
      return;
    }

    const otherActiveSuperAdmins = await this.prisma.user.count({
      where: {
        id: { not: target.id },
        role: 'super_admin',
        isActive: true,
      },
    });

    if (otherActiveSuperAdmins === 0) {
      throw new ConflictException(
        'آخرین مدیر ارشد فعال را نمی‌توان غیرفعال یا تنزل نقش داد',
      );
    }
  }

  private requireRole(value: unknown): UserRole {
    const role = normalizeUserRole(value);

    if (!role) throw new ConflictException('نقش کاربر معتبر نیست');

    return role;
  }

  private cleanNullableText(value?: string): string | null {
    if (value === undefined) return null;

    const clean = value.trim();
    return clean || null;
  }

  private cleanEmail(value?: string): string | null {
    if (value === undefined) return null;

    const clean = value.trim().toLowerCase();
    return clean || null;
  }

  private handleUniqueConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('شماره موبایل یا ایمیل قبلاً ثبت شده است');
    }
  }
}
