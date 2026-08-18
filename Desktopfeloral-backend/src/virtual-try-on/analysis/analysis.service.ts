import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class AnalysisService {


  constructor(
    private readonly prisma: PrismaService,
  ) {}



  async analyzeFace(sessionId: number) {


    const session =
      await this.prisma.virtualTryOnSession.findUnique({

        where:{
          id: sessionId,
        },

      });



    if(!session){

      throw new NotFoundException(
        'Session پیدا نشد',
      );

    }



    const analysis =
      await this.prisma.virtualTryOnAnalysis.upsert({

        where:{
          sessionId,
        },


        create:{

          sessionId,

          faceDetected:true,

          landmarks:{
            mock:true,
            message:
              'AI face analysis placeholder',
          },


          lipMaskUrl:
            '/uploads/masks/mock-lips.png',


          skinMaskUrl:
            '/uploads/masks/mock-skin.png',


          eyeMaskUrl:
            '/uploads/masks/mock-eyes.png',

        },


        update:{


          faceDetected:true,


        },

      });



    return analysis;

  }


}