import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ProductRegionType,
  TryOnStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateTryOnSessionDto } from './dto/create-try-on-session.dto';
import { UpdateTryOnResultDto } from './dto/update-try-on-result.dto';
import { ProcessTryOnDto } from './dto/process-try-on.dto';

@Injectable()
export class VirtualTryOnService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: number, data: CreateTryOnSessionDto) {
    if (!data.consentAccepted) {
      throw new BadRequestException(
        'User consent is required for virtual try-on',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: {
        id: data.productId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Active product not found');
    }

    let finalRegion: ProductRegionType | null = data.region ?? null;

    if (data.shadeId) {
      const shade = await this.prisma.productShade.findUnique({
        where: {
          id: data.shadeId,
        },
        select: {
          id: true,
          productId: true,
          region: true,
          isActive: true,
        },
      });

      if (!shade || !shade.isActive) {
        throw new NotFoundException('Active product shade not found');
      }

      if (shade.productId !== data.productId) {
        throw new BadRequestException(
          'Shade does not belong to this product',
        );
      }

      finalRegion = data.region ?? shade.region;
    }

    return this.prisma.virtualTryOnSession.create({
      data: {
        userId,
        productId: data.productId,
        shadeId: data.shadeId ?? null,
        region: finalRegion,
        sourceImageUrl: data.sourceImageUrl ?? null,
        resultImageUrl: null,
        status: TryOnStatus.pending,
        errorMessage: null,
        consentAccepted: true,
      },
      include: this.sessionInclude(),
    });
  }

  async getMySessions(userId: number) {
    return this.prisma.virtualTryOnSession.findMany({
      where: {
        userId,
      },
      include: this.sessionInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMySessionById(userId: number, id: number) {
    const session =
      await this.prisma.virtualTryOnSession.findUnique({
        where: {
          id,
        },
        include: this.sessionInclude(),
      });

    if (!session) {
      throw new NotFoundException('Try-on session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this try-on session',
      );
    }

    return session;
  }

  async updateMySessionResult(
    userId: number,
    id: number,
    data: UpdateTryOnResultDto,
  ) {
    await this.getMySessionById(userId, id);

    if (
      data.status === TryOnStatus.completed &&
      !data.resultImageUrl
    ) {
      throw new BadRequestException(
        'resultImageUrl is required when status is completed',
      );
    }

    if (
      data.status === TryOnStatus.failed &&
      !data.errorMessage
    ) {
      throw new BadRequestException(
        'errorMessage is required when status is failed',
      );
    }

    return this.prisma.virtualTryOnSession.update({
      where: {
        id,
      },
      data: {
        status: data.status,
        resultImageUrl: data.resultImageUrl ?? null,
        errorMessage: data.errorMessage ?? null,
      },
      include: this.sessionInclude(),
    });
  }

  async processMySession(
    userId: number,
    id: number,
    data: ProcessTryOnDto,
  ) {
    const session = await this.getMySessionById(userId, id);

    if (!session.consentAccepted) {
      throw new BadRequestException(
        'User consent is required for virtual try-on processing',
      );
    }

    if (!session.sourceImageUrl) {
      throw new BadRequestException(
        'sourceImageUrl is required for virtual try-on processing',
      );
    }

    const mockResultImageUrl =
      data.resultImageUrl ??
      `/uploads/try-on/results/session-${id}-mock-result.jpg`;

    const updatedSession =
      await this.prisma.virtualTryOnSession.update({
        where: {
          id,
        },
        data: {
          status: TryOnStatus.completed,
          resultImageUrl: mockResultImageUrl,
          errorMessage: null,
        },
        include: this.sessionInclude(),
      });

    return {
      engine: 'feloral_mock_try_on_engine',
      status: 'completed',
      message:
        'Try-on processing simulated successfully. Later this endpoint will connect to real AI/image processing.',
      processingNote:
        data.processingNote ??
        'Mock processing applied. No real image manipulation yet.',
      session: updatedSession,
    };
  }

  async deleteMySession(userId: number, id: number) {
    await this.getMySessionById(userId, id);

    return this.prisma.virtualTryOnSession.delete({
      where: {
        id,
      },
    });
  }

  async getAllForAdmin() {
    return this.prisma.virtualTryOnSession.findMany({
      include: this.sessionInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getByIdForAdmin(id: number) {
    const session =
      await this.prisma.virtualTryOnSession.findUnique({
        where: {
          id,
        },
        include: this.sessionInclude(),
      });

    if (!session) {
      throw new NotFoundException('Try-on session not found');
    }

    return session;
  }

  private sessionInclude() {
    return {
      user: {
        select: {
          id: true,
          fullName: true,
          mobile: true,
          email: true,
          role: true,
        },
      },

      product: {
        select: {
          id: true,
          name: true,
          englishName: true,
          slug: true,
          brand: true,
          category: true,
          images: {
            orderBy: [
              { isPrimary: 'desc' as const },
              { sortOrder: 'asc' as const },
              { id: 'asc' as const },
            ],
          },
        },
      },

      shade: {
        select: {
          id: true,
          name: true,
          code: true,
          hexColor: true,
          region: true,
          finish: true,
          opacity: true,
          previewImage: true,
        },
      },
    };
  }
}