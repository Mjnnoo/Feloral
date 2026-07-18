import {
  Body,
  Controller,
  Delete,
  Get,
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
import {
  CATALOG_ADMIN_READ_ROLES,
  CATALOG_DEACTIVATE_ROLES,
  CATALOG_INVENTORY_ROLES,
  CATALOG_VARIANT_WRITE_ROLES,
} from '../catalog/constants/catalog-roles';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import {
  PublicProductVariantsQueryDto,
  QueryProductVariantsDto,
  QueryStockMovementsDto,
} from './dto/query-product-variants.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductVariantsService } from './product-variants.service';

@Controller('product-variants')
export class ProductVariantsController {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_VARIANT_WRITE_ROLES)
  @Post()
  create(
    @User() actor: AuthenticatedUser,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productVariantsService.create(actor, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_ADMIN_READ_ROLES)
  @Get('admin')
  findAdmin(@Query() query: QueryProductVariantsDto) {
    return this.productVariantsService.findAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_INVENTORY_ROLES)
  @Get('admin/:id/stock-movements')
  listStockMovements(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryStockMovementsDto,
  ) {
    return this.productVariantsService.listStockMovements(id, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_ADMIN_READ_ROLES)
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.productVariantsService.findOneAdmin(id);
  }

  @Get()
  findPublic(@Query() query: PublicProductVariantsQueryDto) {
    return this.productVariantsService.findPublic(query);
  }

  @Get(':id')
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.productVariantsService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_VARIANT_WRITE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productVariantsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_INVENTORY_ROLES)
  @Patch(':id/stock')
  adjustStock(
    @User() actor: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
  ) {
    return this.productVariantsService.adjustStock(actor, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_DEACTIVATE_ROLES)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.productVariantsService.deactivate(id);
  }
}
