import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { PriceIntelligenceController } from './price-intelligence.controller';
import { PriceIntelligenceService } from './price-intelligence.service';
import { PriceCrawlerService } from './price-crawler.service';

@Module({
  imports: [PrismaModule],
  controllers: [PriceIntelligenceController],
  providers: [PriceIntelligenceService, PriceCrawlerService],
  exports: [PriceIntelligenceService, PriceCrawlerService],
})
export class PriceIntelligenceModule {}