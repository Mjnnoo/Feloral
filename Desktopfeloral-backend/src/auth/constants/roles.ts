export const USER_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'editor',
  'support',
  'warehouse',
  'seo',
  'ai',
  'customer',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_LOGIN_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'editor',
  'support',
  'warehouse',
  'seo',
  'ai',
] as const satisfies readonly UserRole[];

export const USER_READ_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'support',
] as const satisfies readonly UserRole[];

export const USER_WRITE_ROLES = [
  'super_admin',
  'admin',
] as const satisfies readonly UserRole[];

export const USER_ROLE_PRIORITY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 90,
  manager: 70,
  editor: 60,
  warehouse: 60,
  seo: 60,
  ai: 60,
  support: 50,
  customer: 10,
};

export function normalizeUserRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();

  return USER_ROLES.includes(normalized as UserRole)
    ? (normalized as UserRole)
    : null;
}
