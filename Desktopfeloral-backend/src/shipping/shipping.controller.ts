import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateShippingMethodDto } from './dto/create-shipping-method.dto';
import { ShippingQuoteDto } from './dto/shipping-quote.dto';
import { UpdateShippingMethodDto } from './dto/update-shipping-method.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
@UseGuards(JwtAuthGuard)
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('methods')
  listActive() {
    return this.shippingService.listActive();
  }

  @Post('quote')
  quote(@User() user: AuthenticatedUser, @Body() dto: ShippingQuoteDto) {
    return this.shippingService.quote(user.id, dto);
  }

  @Get('admin/methods')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager')
  adminList() {
    return this.shippingService.adminList();
  }

  @Post('admin/methods')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  create(@Body() dto: CreateShippingMethodDto) {
    return this.shippingService.create(dto);
  }

  @Patch('admin/methods/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShippingMethodDto,
  ) {
    return this.shippingService.update(id, dto);
  }

  @Delete('admin/methods/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.shippingService.deactivate(id);
  }
}
