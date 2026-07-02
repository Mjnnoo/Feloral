import { IsBoolean } from 'class-validator';

export class UpdateVariantActiveDto {
  @IsBoolean({ message: 'وضعیت فعال بودن باید true یا false باشد' })
  isActive!: boolean;
}