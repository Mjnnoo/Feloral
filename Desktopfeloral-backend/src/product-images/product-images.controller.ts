import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CATALOG_ADMIN_READ_ROLES,
  CATALOG_DEACTIVATE_ROLES,
  CATALOG_MEDIA_WRITE_ROLES,
} from '../catalog/constants/catalog-roles';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import {
  PublicProductImagesQueryDto,
  QueryProductImagesDto,
} from './dto/query-product-images.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductImagesService } from './product-images.service';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

@Controller('product-images')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_MEDIA_WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateProductImageDto) {
    return this.productImagesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_MEDIA_WRITE_ROLES)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(
              'فرمت تصویر باید JPEG، PNG، WebP یا AVIF باشد',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('فایل تصویر ارسال نشده است');
    return this.productImagesService.saveUpload(file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_ADMIN_READ_ROLES)
  @Get('admin')
  findAdmin(@Query() query: QueryProductImagesDto) {
    return this.productImagesService.findAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_ADMIN_READ_ROLES)
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.productImagesService.findOneAdmin(id);
  }

  @Get()
  findPublic(@Query() query: PublicProductImagesQueryDto) {
    return this.productImagesService.findPublic(query);
  }

  @Get(':id')
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.productImagesService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_MEDIA_WRITE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productImagesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CATALOG_DEACTIVATE_ROLES)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productImagesService.remove(id);
  }
}
