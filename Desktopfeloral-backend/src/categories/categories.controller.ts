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
import { PublicCatalogQueryDto } from '../catalog/dto/catalog-query.dto';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_CONTENT_WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_ADMIN_READ_ROLES)
  @Get('admin')
  findAdmin(@Query() query: QueryCategoriesDto) {
    return this.categoriesService.findAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_ADMIN_READ_ROLES)
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOneAdmin(id);
  }

  @Get()
  findPublic(@Query() query: PublicCatalogQueryDto) {
    return this.categoriesService.findPublic(query);
  }

  @Get(':id')
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_CONTENT_WRITE_ROLES)
  @Patch(':id')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_DEACTIVATE_ROLES)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.deactivate(id);
  }
}
