import { JobService } from './job/job.service';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateTryOnSessionDto } from './dto/create-try-on-session.dto';


@Injectable()
export class VirtualTryOnService {

  constructor(
  private readonly prisma: PrismaService,
  private readonly storage: StorageService,
  private readonly jobService: JobService,
) {}


  async createSession(
    userId: number,
    dto: CreateTryOnSessionDto,
  ) {

    if (!dto.consentAccepted) {
      throw new BadRequestException(
        'تایید استفاده از تصویر الزامی است',
      );
    }


    const product =
      await this.prisma.product.findUnique({
        where: {
          id: dto.productId,
          isActive: true,
        },
      });


    if (!product) {
      throw new NotFoundException(
        'محصول پیدا نشد',
      );
    }


    if (dto.shadeId) {

      const shade =
        await this.prisma.productShade.findFirst({
          where: {
            id: dto.shadeId,
            productId: dto.productId,
            isActive: true,
          },
        });


      if (!shade) {
        throw new NotFoundException(
          'رنگ محصول پیدا نشد',
        );
      }

    }


    return this.prisma.virtualTryOnSession.create({

      data: {
        userId,
        productId: dto.productId,
        shadeId: dto.shadeId ?? null,
        region: dto.region,
        consentAccepted: true,
        status: 'pending',
      },

      include: {
        product: true,
        shade: true,
      },

    });

  }



  async findSession(id: number) {

    const session =
      await this.prisma.virtualTryOnSession.findUnique({

        where: {
          id,
        },

        include: {
          product: true,
          shade: true,
        },

      });


    if (!session) {
      throw new NotFoundException(
        'Session پیدا نشد',
      );
    }


    return session;
  }



  async uploadImage(
    sessionId: number,
    file: Express.Multer.File,
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


    if (!file) {
      throw new BadRequestException(
        'فایل تصویر ارسال نشده است',
      );
    }


    const uploaded =
      await this.storage.saveImage(
        file,
        'try-on/source',
      );

      await this.jobService.createFaceAnalysisJob(
  sessionId,
);


    return this.prisma.virtualTryOnSession.update({

      where: {
        id: sessionId,
      },

      data: {
        sourceImageUrl: uploaded.imageUrl,
        status: 'processing',
      },

      include: {
        product: true,
        shade: true,
      },

    });

  }

}