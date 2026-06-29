import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('create')
  createOrder(@User() user: any) {
    return this.orderService.createOrder(user.id);
  }

  @Get()
  getOrders(@User() user: any) {
    return this.orderService.getOrders(user.id);
  }

  @Get(':id')
  getOrderById(@User() user: any, @Param('id') id: string) {
    return this.orderService.getOrderById(Number(id), user.id);
  }
}