import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateShipmentDto {
  @IsOptional()
  @IsEnum({ postex: 'postex', post: 'post', tipax: 'tipax', alopeyk: 'alopeyk', snapp: 'snapp', tapsi: 'tapsi', courier: 'courier', free: 'free', other: 'other' })
  provider?: 'postex' | 'post' | 'tipax' | 'alopeyk' | 'snapp' | 'tapsi' | 'courier' | 'free' | 'other';

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  trackingCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerOrderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
