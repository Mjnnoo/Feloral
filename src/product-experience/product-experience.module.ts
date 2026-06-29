import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ProductExperienceController } from './product-experience.controller';
import { ProductExperienceService } from './product-experience.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductExperienceController],
  providers: [ProductExperienceService],
  exports: [ProductExperienceService],
})
export class ProductExperienceModule {}