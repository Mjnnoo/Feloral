import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'support')
  adminList(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.adminList(query);
  }

  @Get('admin/order/:orderId')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'support')
  getAdmin(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.invoicesService.getAdmin(orderId);
  }

  @Get('order/:orderId')
  getMine(
    @User() user: AuthenticatedUser,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.invoicesService.getMine(orderId, user.id);
  }
}
