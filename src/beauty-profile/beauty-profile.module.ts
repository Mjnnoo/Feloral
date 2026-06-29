import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { BeautyProfileController } from './beauty-profile.controller';
import { BeautyProfileService } from './beauty-profile.service';

@Module({
  imports: [PrismaModule],
  controllers: [BeautyProfileController],
  providers: [BeautyProfileService],
  exports: [BeautyProfileService],
})
export class BeautyProfileModule {}