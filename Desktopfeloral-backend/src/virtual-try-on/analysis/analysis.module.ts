import { Module } from '@nestjs/common';

import { AnalysisService } from './analysis.service';

import { PrismaService } from '../../prisma/prisma.service';


@Module({

  providers:[
    AnalysisService,
    PrismaService,
  ],

  exports:[
    AnalysisService,
  ],

})
export class AnalysisModule {}