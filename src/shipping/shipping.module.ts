import { Module } from '@nestjs/common';

import { ShippingController } from './shipping.controller';
import { PostexService } from './postex.service';

@Module({
  controllers: [ShippingController],
  providers: [PostexService],
  exports: [PostexService],
})
export class ShippingModule {}