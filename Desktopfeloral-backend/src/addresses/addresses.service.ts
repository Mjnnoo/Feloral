import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: number) {
    return this.prisma.address.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async create(userId: number, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const activeCount = await tx.address.count({
        where: { userId, isActive: true },
      });
      const makeDefault = dto.isDefault === true || activeCount === 0;

      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId, isActive: true, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          ...dto,
          userId,
          isDefault: makeDefault,
          isActive: true,
        },
      });
    });
  }

  async update(userId: number, id: number, dto: UpdateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.address.findFirst({
        where: { id, userId, isActive: true },
      });
      if (!address) throw new NotFoundException('آدرس پیدا نشد');

      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, isActive: true, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: dto,
      });
    });
  }

  async setDefault(userId: number, id: number) {
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.address.findFirst({
        where: { id, userId, isActive: true },
      });
      if (!address) throw new NotFoundException('آدرس پیدا نشد');

      await tx.address.updateMany({
        where: { userId, isActive: true, isDefault: true },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  async remove(userId: number, id: number) {
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.address.findFirst({
        where: { id, userId, isActive: true },
      });
      if (!address) throw new NotFoundException('آدرس پیدا نشد');

      await tx.address.update({
        where: { id },
        data: { isActive: false, isDefault: false },
      });

      if (address.isDefault) {
        const replacement = await tx.address.findFirst({
          where: { userId, isActive: true },
          orderBy: { updatedAt: 'desc' },
          select: { id: true },
        });
        if (replacement) {
          await tx.address.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }

      return { success: true };
    });
  }
}
