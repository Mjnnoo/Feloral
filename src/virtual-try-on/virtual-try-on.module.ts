import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { VirtualTryOnController } from './virtual-try-on.controller';
import { VirtualTryOnService } from './virtual-try-on.service';

@Module({
  imports: [PrismaModule],
  controllers: [VirtualTryOnController],
  providers: [VirtualTryOnService],
  exports: [VirtualTryOnService],
})
export class VirtualTryOnModule {}