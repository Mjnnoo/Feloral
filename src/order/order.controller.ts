import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';

type AuthUser = {
  id: number;
  mobile: string;
  role: string;
};

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('create')
  createOrder(
    @User() user: AuthUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT, Role.WAREHOUSE)
  @Get('admin/all')
  getAllOrdersForAdmin() {
    return this.orderService.getAllOrdersForAdmin();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT, Role.WAREHOUSE)
  @Get('admin/:id')
  getOrderByIdForAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getOrderByIdForAdmin(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT, Role.WAREHOUSE)
  @Patch('admin/:id/status')
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(id, dto.status);
  }

  @Get()
  getOrders(@User() user: AuthUser) {
    return this.orderService.getOrders(user.id);
  }

  @Get(':id')
  getOrderById(
    @User() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.getOrderById(id, user.id);
  }
}