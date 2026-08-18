import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  VirtualTryOnJobStatus,
  VirtualTryOnJobType,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class JobService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}



  async createFaceAnalysisJob(
    sessionId: number,
  ) {

    const session =
      await this.prisma.virtualTryOnSession.findUnique({
        where: {
          id: sessionId,
        },
      });


    if (!session) {
      throw new NotFoundException(
        'Session پیدا نشد',
      );
    }


    return this.prisma.virtualTryOnJob.create({

      data: {
        sessionId,

        type: VirtualTryOnJobType.face_analysis,

        status: VirtualTryOnJobStatus.queued,
      },

    });

  }



  async updateStatus(
    jobId: number,
    status: VirtualTryOnJobStatus,
    errorMessage?: string,
  ) {

    return this.prisma.virtualTryOnJob.update({

      where: {
        id: jobId,
      },

      data: {

        status,

        ...(status === VirtualTryOnJobStatus.running
          ? {
              startedAt: new Date(),
            }
          : {}),

        ...(status === VirtualTryOnJobStatus.completed ||
        status === VirtualTryOnJobStatus.failed
          ? {
              finishedAt: new Date(),
            }
          : {}),

        ...(errorMessage
          ? {
              errorMessage,
            }
          : {}),

      },

    });

  }



  async getSessionJobs(
    sessionId:number,
  ){

    return this.prisma.virtualTryOnJob.findMany({

      where:{
        sessionId,
      },

      orderBy:{
        createdAt:'asc',
      },

    });

  }

}