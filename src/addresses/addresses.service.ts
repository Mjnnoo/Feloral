import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, data: CreateAddressDto) {
    const activeAddressesCount = await this.prisma.address.count({
      where: {
        userId,
        isActive: true,
      },
    });

    const shouldBeDefault =
      data.isDefault === true || activeAddressesCount === 0;

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: {
            userId,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.address.create({
        data: {
          userId,
          title: data.title ?? null,
          receiverName: data.receiverName,
          receiverMobile: data.receiverMobile,
          province: data.province,
          city: data.city,
          addressLine: data.addressLine,
          postalCode: data.postalCode,
          plaque: data.plaque ?? null,
          unit: data.unit ?? null,
          isDefault: shouldBeDefault,
          isActive: true,
        },
      });
    });
  }

  findAll(userId: number) {
    return this.prisma.address.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: [
        {
          isDefault: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findOne(userId: number, id: number) {
    const address = await this.prisma.address.findFirst({
      where: {
        id,
        userId,
        isActive: true,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(
    userId: number,
    id: number,
    data: UpdateAddressDto,
  ) {
    await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        await tx.address.updateMany({
          where: {
            userId,
            id: {
              not: id,
            },
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.address.update({
        where: { id },
        data,
      });
    });
  }

  async setDefault(userId: number, id: number) {
    await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: {
          userId,
        },
        data: {
          isDefault: false,
        },
      });

      return tx.address.update({
        where: { id },
        data: {
          isDefault: true,
        },
      });
    });
  }

  async remove(userId: number, id: number) {
    const address = await this.findOne(userId, id);

    await this.prisma.address.update({
      where: { id },
      data: {
        isActive: false,
        isDefault: false,
      },
    });

    if (address.isDefault) {
      const nextAddress = await this.prisma.address.findFirst({
        where: {
          userId,
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (nextAddress) {
        await this.prisma.address.update({
          where: { id: nextAddress.id },
          data: {
            isDefault: true,
          },
        });
      }
    }

    return {
      message: 'Address removed successfully',
    };
  }
}