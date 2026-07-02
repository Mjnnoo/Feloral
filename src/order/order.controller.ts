import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { OrderService } from './order.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

type AuthUser = {
  id: number;
  mobile: string;
  role: string;
};

@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  checkout(@User() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.orderService.checkout(user.id, dto);
  }

  @Get('my-orders')
  getMyOrders(@User() user: AuthUser) {
    return this.orderService.getMyOrders(user.id);
  }

  @Get('my-orders/:id')
  getMyOrderById(
    @User() user: AuthUser,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.orderService.getMyOrderById(user.id, orderId);
  }
}