import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const makeContext = (role?: string) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it('allows routes without role metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(new RolesGuard(reflector).canActivate(makeContext())).toBe(true);
  });

  it('allows a matching normalized role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['admin']);

    expect(new RolesGuard(reflector).canActivate(makeContext('ADMIN'))).toBe(
      true,
    );
  });

  it('rejects a missing or disallowed role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['super_admin']);

    expect(new RolesGuard(reflector).canActivate(makeContext('support'))).toBe(
      false,
    );
    expect(new RolesGuard(reflector).canActivate(makeContext())).toBe(false);
  });
});
