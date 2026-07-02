import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { DashboardService } from './dashboard.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT, Role.WAREHOUSE)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // مسیر قدیمی پروژه خودت - نگهش داشتیم که چیزی خراب نشه
  @Get('stats')
  getStats() {
    return this.dashboardService.getAdminSummary();
  }

  @Get('admin/summary')
  getAdminSummary() {
    return this.dashboardService.getAdminSummary();
  }

  @Get('admin/sales')
  getSalesStats(@Query('days') days?: string) {
    return this.dashboardService.getSalesStats(days);
  }

  @Get('admin/orders')
  getLatestOrders(@Query('limit') limit?: string) {
    return this.dashboardService.getLatestOrders(limit);
  }

  @Get('admin/low-stock')
  getLowStock(
    @Query('threshold') threshold?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getLowStock(threshold, limit);
  }
}