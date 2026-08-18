import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';


@Injectable()
export class WorkerService {


  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}



  async processJobs() {


    const jobs =
      await this.prisma.virtualTryOnJob.findMany({

        where:{
          status:'queued',
        },

        take:10,

      });



    const results = [];



    for(const job of jobs){


      await this.prisma.virtualTryOnJob.update({

        where:{
          id:job.id,
        },

        data:{
          status:'running',
          startedAt:new Date(),
        },

      });



      try {


        const session =
          await this.prisma.virtualTryOnSession.findUnique({

            where:{
              id:job.sessionId,
            },

            include:{
              shade:true,
              product:true,
            },

          });



        if(!session){

          throw new Error(
            'Virtual Try On Session not found',
          );

        }



        if(!session.sourceImageUrl){

          throw new Error(
            'Source image not found',
          );

        }



        const aiResult =
          await this.aiService.generateTryOn(

            session.sourceImageUrl,

            session.shade?.hexColor ?? '',

            session.region ?? 'face',

          );



        await this.prisma.virtualTryOnSession.update({

          where:{
            id:session.id,
          },

          data:{

            resultImageUrl:
              aiResult.imageUrl,

            status:'completed',

          },

        });



        await this.prisma.virtualTryOnJob.update({

          where:{
            id:job.id,
          },

          data:{

            status:'completed',

            finishedAt:new Date(),

          },

        });



        results.push({

          jobId:job.id,

          status:'completed',

        });



      } catch(error){



        await this.prisma.virtualTryOnJob.update({

          where:{
            id:job.id,
          },

          data:{

            status:'failed',

            errorMessage:
              error.message,

          },

        });



        results.push({

          jobId:job.id,

          status:'failed',

        });


      }


    }



    return results;

  }


}