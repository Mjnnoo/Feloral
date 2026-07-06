import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

import { OrderPostexTrackingService } from './postex-tracking.service';

@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderPostexTrackingController {
  constructor(
    private readonly orderPostexTrackingService: OrderPostexTrackingService,
  ) {}

  @Get('admin/orders/:id/postex/tracking')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getOrderPostexTracking(@Param('id', ParseIntPipe) orderId: number) {
    return this.orderPostexTrackingService.getTracking(orderId);
  }
}
