import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

@Injectable()
export class ProductImagesService {

  constructor(private prisma: PrismaService) {}

  create(data: CreateProductImageDto) {
    return this.prisma.productImage.create({
      data,
    });
  }

  findAll() {
    return this.prisma.productImage.findMany({
      include: {
        product: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  findOne(id: number) {
    return this.prisma.productImage.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });
  }

  update(id: number, data: UpdateProductImageDto) {
    return this.prisma.productImage.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.productImage.delete({
      where: { id },
    });
  }
}