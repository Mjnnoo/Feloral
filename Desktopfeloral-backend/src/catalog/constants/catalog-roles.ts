import type { UserRole } from '../../auth/constants/roles';

export const CATALOG_ADMIN_READ_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'editor',
  'support',
  'warehouse',
  'seo',
] as const satisfies readonly UserRole[];

export const CATALOG_CONTENT_WRITE_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'editor',
  'seo',
] as const satisfies readonly UserRole[];

export const CATALOG_VARIANT_WRITE_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'editor',
] as const satisfies readonly UserRole[];

export const CATALOG_MEDIA_WRITE_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'editor',
] as const satisfies readonly UserRole[];

export const CATALOG_INVENTORY_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'warehouse',
] as const satisfies readonly UserRole[];

export const CATALOG_DEACTIVATE_ROLES = [
  'super_admin',
  'admin',
  'manager',
] as const satisfies readonly UserRole[];
