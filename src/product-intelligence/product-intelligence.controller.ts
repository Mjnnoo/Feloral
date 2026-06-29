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

import { ProductIntelligenceService } from './product-intelligence.service';

import { CreateProductIntelligenceDto } from './dto/create-product-intelligence.dto';
import { UpdateProductIntelligenceDto } from './dto/update-product-intelligence.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { RolesGuard } from '../auth/roles/roles.guard';

@Controller('product-intelligence')
export class ProductIntelligenceController {
  constructor(
    private readonly productIntelligenceService: ProductIntelligenceService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SEO, Role.AI)
  @Post()
  create(@Body() dto: CreateProductIntelligenceDto) {
    return this.productIntelligenceService.create(dto);
  }

  @Get()
  findAll() {
    return this.productIntelligenceService.findAll();
  }

  @Get('product/:productId')
  findByProduct(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productIntelligenceService.findByProduct(
      productId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SEO, Role.AI)
  @Patch('product/:productId')
  upsertByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateProductIntelligenceDto,
  ) {
    return this.productIntelligenceService.upsertByProduct(
      productId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SEO, Role.AI)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productIntelligenceService.remove(id);
  }
}