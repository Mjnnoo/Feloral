import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  create(data: { name: string; slug: string }) {
    return this.prisma.brand.create({
      data,
    });
  }

  findAll() {
    return this.prisma.brand.findMany({
      orderBy: { id: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.brand.findUnique({
      where: { id },
    });
  }

  update(id: number, data: { name?: string; slug?: string }) {
    return this.prisma.brand.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.brand.delete({
      where: { id },
    });
  }
}