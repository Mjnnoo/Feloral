import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @Type(() => Boolean)
  @IsBoolean({ message: 'وضعیت کاربر باید true یا false باشد' })
  isActive!: boolean;
}