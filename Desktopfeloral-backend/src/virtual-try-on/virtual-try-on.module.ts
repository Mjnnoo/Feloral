import { Module } from '@nestjs/common';

import { VirtualTryOnController } from './virtual-try-on.controller';
import { VirtualTryOnService } from './virtual-try-on.service';

import { WorkerService } from './worker/worker.service';
import { JobService } from './job/job.service';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AnalysisModule } from './analysis/analysis.module';
import { AiModule } from '../ai/ai.module';


@Module({
  controllers: [
    VirtualTryOnController,
  ],

  providers: [
    VirtualTryOnService,
    WorkerService,
    JobService,
    PrismaService,
    StorageService,
  ],

  exports: [
    VirtualTryOnService,
    WorkerService,
  ],

  imports: [AnalysisModule,
     AiModule,
  ]
  })
export class VirtualTryOnModule {}