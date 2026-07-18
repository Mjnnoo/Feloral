import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('create')
  createOrder(
    @User() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.orderService.createOrder(user.id, dto, idempotencyKey);
  }

  @Post('maintenance/release-expired')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'warehouse')
  releaseExpiredReservations() {
    return this.orderService.releaseExpiredReservations(100);
  }

  @Get()
  getOrders(@User() user: AuthenticatedUser) {
    return this.orderService.getOrders(user.id);
  }

  @Post(':id/cancel')
  cancelOrder(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.cancelOrder(id, user.id);
  }

  @Get(':id')
  getOrderById(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.getOrderById(id, user.id);
  }
}
