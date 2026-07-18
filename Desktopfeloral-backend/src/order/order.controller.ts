import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
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

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'support', 'warehouse')
  adminList(@Query() query: AdminOrderQueryDto) {
    return this.orderService.adminList(query);
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'support', 'warehouse')
  getAdminOrder(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getAdminOrderById(id);
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'support', 'warehouse')
  updateStatus(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateAdminStatus(id, user.id, dto);
  }

  @Patch('admin/:id/shipment')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'warehouse')
  updateShipment(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShipmentDto,
  ) {
    return this.orderService.updateShipment(id, user.id, dto);
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
