import { Module } from '@nestjs/common';

import { OrderModule } from '../order/order.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PostexModule } from '../postex/postex.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [PrismaModule, OrderModule, PostexModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
