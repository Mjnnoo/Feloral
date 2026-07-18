import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { effectivePrice } from '../order/order.utils';
import { PrismaService } from '../prisma/prisma.service';
import { PostexService } from '../postex/postex.service';
import { CreateShippingMethodDto } from './dto/create-shipping-method.dto';
import { ShippingQuoteDto } from './dto/shipping-quote.dto';
import { UpdateShippingMethodDto } from './dto/update-shipping-method.dto';
import { assertEstimatedDays, calculateShippingCost } from './shipping.utils';

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postexService: PostexService,
  ) {}

  listActive() {
    return (this.prisma as any).shippingMethod.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  adminList() {
    return (this.prisma as any).shippingMethod.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async create(dto: CreateShippingMethodDto) {
    assertEstimatedDays(dto.estimatedMinDays, dto.estimatedMaxDays);
    try {
      return await (this.prisma as any).shippingMethod.create({ data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('کد روش ارسال تکراری است');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateShippingMethodDto) {
    assertEstimatedDays(dto.estimatedMinDays, dto.estimatedMaxDays);
    const method = await (this.prisma as any).shippingMethod.findUnique({ where: { id } });
    if (!method) throw new NotFoundException('روش ارسال پیدا نشد');

    try {
      return await (this.prisma as any).shippingMethod.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('کد روش ارسال تکراری است');
      }
      throw error;
    }
  }

  async deactivate(id: number) {
    const result = await (this.prisma as any).shippingMethod.updateMany({
      where: { id, isActive: true },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('روش ارسال فعال پیدا نشد');
    return { success: true };
  }

  async quote(userId: number, dto: ShippingQuoteDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { variant: { include: { product: true } } },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('سبد خرید خالی است');
    }

    let subtotal = new Prisma.Decimal(0);
    let totalWeightGram = 0;
    for (const item of cart.items) {
      if (!item.variant.isActive || !item.variant.product.isActive) {
        throw new BadRequestException('سبد خرید شامل کالای غیرفعال است');
      }
      subtotal = subtotal.plus(effectivePrice(item.variant).mul(item.quantity));
      totalWeightGram += item.variant.weightGram * item.quantity;
    }

    const resolved = await this.resolveForCheckout(
      this.prisma as any,
      userId,
      dto.addressId,
      dto.shippingMethodId,
      subtotal,
    );

    return { ...resolved, subtotal, totalWeightGram };
  }

  resolvePostexForCheckout(
    tx: any,
    userId: number,
    addressId: number,
    postexQuoteId: string,
    subtotal: Prisma.Decimal,
    cartItems: Array<any>,
  ) {
    return this.postexService.resolveQuoteForCheckout(
      tx,
      userId,
      addressId,
      postexQuoteId,
      subtotal,
      cartItems,
    );
  }

  markPostexQuoteConsumed(tx: any, quoteId: string) {
    return this.postexService.markQuoteConsumed(tx, quoteId);
  }

  async resolveForCheckout(
    tx: any,
    userId: number,
    addressId: number,
    shippingMethodId: number,
    subtotal: Prisma.Decimal,
  ) {
    const [address, method] = await Promise.all([
      tx.address.findFirst({ where: { id: addressId, userId, isActive: true } }),
      tx.shippingMethod.findFirst({ where: { id: shippingMethodId, isActive: true } }),
    ]);

    if (!address) throw new NotFoundException('آدرس فعال پیدا نشد');
    if (!method) throw new NotFoundException('روش ارسال فعال پیدا نشد');

    const shippingCost = calculateShippingCost(subtotal, method.flatRate, method.freeAbove);

    return {
      address,
      method,
      shippingCost,
      estimatedMinDays: method.estimatedMinDays,
      estimatedMaxDays: method.estimatedMaxDays,
    };
  }
}
