import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';

import { AiAdvisorController } from './ai-advisor.controller';
import { AiAdvisorService } from './ai-advisor.service';

@Module({
  imports: [PrismaModule, RecommendationsModule],
  controllers: [AiAdvisorController],
  providers: [AiAdvisorService],
  exports: [AiAdvisorService],
})
export class AiAdvisorModule {}