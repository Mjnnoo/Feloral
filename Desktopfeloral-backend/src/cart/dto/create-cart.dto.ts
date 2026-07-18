import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CreateCartDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number = 1;
}
