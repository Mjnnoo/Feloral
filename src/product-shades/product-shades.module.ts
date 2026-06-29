import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ProductShadesController } from './product-shades.controller';
import { ProductShadesService } from './product-shades.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductShadesController],
  providers: [ProductShadesService],
  exports: [ProductShadesService],
})
export class ProductShadesModule {}