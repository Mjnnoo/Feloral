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

import { ProductExperienceService } from './product-experience.service';

import { CreateProductExperienceDto } from './dto/create-product-experience.dto';
import { UpdateProductExperienceDto } from './dto/update-product-experience.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { RolesGuard } from '../auth/roles/roles.guard';

@Controller('product-experience')
export class ProductExperienceController {
  constructor(
    private readonly productExperienceService: ProductExperienceService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SEO, Role.AI)
  @Post()
  create(@Body() dto: CreateProductExperienceDto) {
    return this.productExperienceService.create(dto);
  }

  @Get()
  findAll() {
    return this.productExperienceService.findAll();
  }

  @Get('product/:productId')
  findByProduct(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productExperienceService.findByProduct(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SEO, Role.AI)
  @Patch('product/:productId')
  upsertByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateProductExperienceDto,
  ) {
    return this.productExperienceService.upsertByProduct(
      productId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SEO, Role.AI)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productExperienceService.remove(id);
  }
}