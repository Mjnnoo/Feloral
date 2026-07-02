import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { InventoryService } from './inventory.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

import { UpdateVariantStockDto } from './dto/update-variant-stock.dto';
import { UpdateVariantPriceDto } from './dto/update-variant-price.dto';
import { UpdateVariantActiveDto } from './dto/update-variant-active.dto';

const PersianIdPipe = new ParseIntPipe({
  exceptionFactory: () => {
    return new BadRequestException('شناسه تنوع محصول باید عدد باشد');
  },
});

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE, Role.SUPPORT)
  @Get('admin/variants')
  getVariants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('productId') productId?: string,
    @Query('brandId') brandId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.inventoryService.getVariants({
      page,
      limit,
      search,
      productId,
      brandId,
      categoryId,
      isActive,
    });
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE, Role.SUPPORT)
  @Get('admin/low-stock')
  getLowStock(
    @Query('threshold') threshold?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getLowStock({
      threshold,
      limit,
    });
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Patch('admin/variants/:id/stock')
  updateStock(
    @Param('id', PersianIdPipe) id: number,
    @Body() dto: UpdateVariantStockDto,
  ) {
    return this.inventoryService.updateStock(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/variants/:id/price')
  updatePrice(
    @Param('id', PersianIdPipe) id: number,
    @Body() dto: UpdateVariantPriceDto,
  ) {
    return this.inventoryService.updatePrice(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Patch('admin/variants/:id/active')
  updateActive(
    @Param('id', PersianIdPipe) id: number,
    @Body() dto: UpdateVariantActiveDto,
  ) {
    return this.inventoryService.updateActive(id, dto);
  }
}