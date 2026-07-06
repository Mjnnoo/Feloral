import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { PrismaModule } from '../prisma/prisma.module';
import { ShippingModule } from '../shipping/shipping.module';
import { PersianBadRequestFilter } from '../common/filters/persian-bad-request.filter';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderPostexTrackingController } from './postex-tracking.controller';
import { OrderPostexTrackingService } from './postex-tracking.service';

@Module({
  imports: [PrismaModule, ShippingModule],
  controllers: [OrderController, OrderPostexTrackingController],
  providers: [
    OrderService,
    OrderPostexTrackingService,
    {
      provide: APP_FILTER,
      useClass: PersianBadRequestFilter,
    },
  ],
  exports: [OrderService],
})
export class OrderModule {}
