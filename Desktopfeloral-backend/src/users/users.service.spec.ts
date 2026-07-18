import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UsersService } from './users.service';

describe('UsersService access rules', () => {
  const actor = (overrides: Partial<AuthenticatedUser> = {}) =>
    ({
      id: 1,
      fullName: 'Admin',
      mobile: '09120000000',
      email: null,
      role: 'admin',
      sessionId: 'session-1',
      ...overrides,
    }) as AuthenticatedUser;

  const user = (overrides: Record<string, unknown> = {}) => ({
    id: 2,
    fullName: 'User',
    mobile: '09121111111',
    email: null,
    role: 'customer',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  function makeService(target = user()) {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue(target),
        update: jest.fn().mockResolvedValue({ ...target, isActive: false }),
        count: jest.fn().mockResolvedValue(1),
      },
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(async (input: unknown) => {
        if (typeof input === 'function') return input(prisma);
        return Promise.all(input as Promise<unknown>[]);
      }),
    };

    return { prisma, service: new UsersService(prisma) };
  }

  it('prevents an admin from managing a super admin', async () => {
    const { service } = makeService(user({ role: 'super_admin' }));

    await expect(
      service.update(actor(), 2, { fullName: 'Changed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents an administrator from deactivating their own account', async () => {
    const current = user({ id: 1, role: 'admin' });
    const { service } = makeService(current);

    await expect(service.deactivate(actor(), 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('soft-deactivates a lower-role user and revokes sessions', async () => {
    const { prisma, service } = makeService();

    const result = await service.deactivate(actor(), 2);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: { isActive: false },
      }),
    );
    expect(prisma.session.updateMany).toHaveBeenCalled();
    expect(result.message).toBe('حساب کاربر غیرفعال شد');
  });
});
