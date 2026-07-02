import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { OrderService } from './order.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
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

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getAdminOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.orderService.getAdminOrders({
      page,
      limit,
      status,
      search,
    });
  }

  @Get('admin/orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getAdminOrderById(@Param('id', ParseIntPipe) orderId: number) {
    return this.orderService.getAdminOrderById(orderId);
  }

  @Patch('admin/orders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateAdminOrderStatus(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateAdminOrderStatus(orderId, dto);
  }
}