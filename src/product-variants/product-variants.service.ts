import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductVariantsService {

  constructor(private prisma: PrismaService) {}

  create(data: CreateProductVariantDto) {
    return this.prisma.productVariant.create({
      data,
    });
  }

  findAll() {
    return this.prisma.productVariant.findMany({
      include: {
        product: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  findOne(id: number) {
    return this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });
  }

  update(id: number, data: UpdateProductVariantDto) {
    return this.prisma.productVariant.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.productVariant.delete({
      where: { id },
    });
  }
}