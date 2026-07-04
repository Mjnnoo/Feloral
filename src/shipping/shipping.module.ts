import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ShippingController } from './shipping.controller';
import { PostexService } from './postex.service';
import { ShippingService } from './shipping.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingController],
  providers: [PostexService, ShippingService],
  exports: [PostexService, ShippingService],
})
export class ShippingModule {}