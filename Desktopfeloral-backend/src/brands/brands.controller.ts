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

import {
  CATALOG_ADMIN_READ_ROLES,
  CATALOG_CONTENT_WRITE_ROLES,
  CATALOG_DEACTIVATE_ROLES,
} from '../catalog/constants/catalog-roles';
import { PublicCatalogQueryDto } from '../catalog/dto/catalog-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryBrandsDto } from './dto/query-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_CONTENT_WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_ADMIN_READ_ROLES)
  @Get('admin')
  findAdmin(@Query() query: QueryBrandsDto) {
    return this.brandsService.findAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_ADMIN_READ_ROLES)
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.findOneAdmin(id);
  }

  @Get()
  findPublic(@Query() query: PublicCatalogQueryDto) {
    return this.brandsService.findPublic(query);
  }

  @Get(':id')
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_CONTENT_WRITE_ROLES)
  @Patch(':id')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_DEACTIVATE_ROLES)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.deactivate(id);
  }
}
