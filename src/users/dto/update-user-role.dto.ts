import { IsEnum } from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class UpdateUserRoleDto {
  @IsEnum(Role, {
    message:
      'نقش کاربر معتبر نیست. نقش‌های مجاز: super_admin, admin, warehouse, seo, ai, support, customer',
  })
  role!: Role;
}