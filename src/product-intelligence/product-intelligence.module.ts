import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ProductIntelligenceController } from './product-intelligence.controller';
import { ProductIntelligenceService } from './product-intelligence.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductIntelligenceController],
  providers: [ProductIntelligenceService],
  exports: [ProductIntelligenceService],
})
export class ProductIntelligenceModule {}