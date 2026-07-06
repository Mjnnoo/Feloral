import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ShippingController } from './shipping.controller';
import { PostexHealthController } from './postex-health.controller';
import { PostexService } from './postex.service';
import { ShippingService } from './shipping.service';
import { PostexPackageSelectorService } from './postex-package-selector.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingController, PostexHealthController],
  providers: [
    PostexService,
    ShippingService,
    PostexPackageSelectorService,
  ],
  exports: [
    PostexService,
    ShippingService,
    PostexPackageSelectorService,
  ],
})
export class ShippingModule {}
