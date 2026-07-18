import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CATALOG_ADMIN_READ_ROLES,
  CATALOG_CONTENT_WRITE_ROLES,
  CATALOG_DEACTIVATE_ROLES,
} from '../catalog/constants/catalog-roles';
import { CreateProductDto } from './dto/create-product.dto';
import {
  PublicProductsQueryDto,
  QueryProductsDto,
} from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_CONTENT_WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_ADMIN_READ_ROLES)
  @Get('admin')
  findAdmin(@Query() query: QueryProductsDto) {
    return this.productsService.findAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_ADMIN_READ_ROLES)
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOneAdmin(id);
  }

  @Get()
  findPublic(@Query() query: PublicProductsQueryDto) {
    return this.productsService.findPublic(query);
  }

  @Get(':id')
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_CONTENT_WRITE_ROLES)
  @Patch(':id')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_DEACTIVATE_ROLES)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deactivate(id);
  }
}
