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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

const allowedImageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

const PersianImageIdPipe = new ParseIntPipe({
  exceptionFactory: () => {
    return new BadRequestException('شناسه تصویر باید عدد باشد');
  },
});

const PersianProductIdPipe = new ParseIntPipe({
  exceptionFactory: () => {
    return new BadRequestException('شناسه محصول باید عدد باشد');
  },
});

const imageUploadInterceptor = FileInterceptor('image', {
  storage: diskStorage({
    destination: './uploads/products',
    filename: (req, file, callback) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      callback(null, unique + extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!allowedImageMimeTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'فقط فایل‌های jpeg، png، webp و avif مجاز هستند',
        ),
        false,
      );
    }

    callback(null, true);
  },
});

@Controller('product-images')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  // مسیرهای جدید پنل ادمین

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Post('admin/upload')
  @UseInterceptors(imageUploadInterceptor)
  adminUpload(@UploadedFile() file: Express.Multer.File) {
    return this.productImagesService.handleUploadedFile(file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Post('admin')
  adminCreate(@Body() dto: CreateProductImageDto) {
    return this.productImagesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE, Role.SUPPORT)
  @Get('admin/product/:productId')
  adminFindByProduct(
    @Param('productId', PersianProductIdPipe) productId: number,
  ) {
    return this.productImagesService.findByProduct(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE, Role.SUPPORT)
  @Get('admin/:id')
  adminFindOne(@Param('id', PersianImageIdPipe) id: number) {
    return this.productImagesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Patch('admin/:id')
  adminUpdate(
    @Param('id', PersianImageIdPipe) id: number,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productImagesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Patch('admin/:id/primary')
  adminSetPrimary(@Param('id', PersianImageIdPipe) id: number) {
    return this.productImagesService.setPrimary(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Delete('admin/:id')
  adminRemove(@Param('id', PersianImageIdPipe) id: number) {
    return this.productImagesService.remove(id);
  }

  // مسیرهای قبلی پروژه - برای سازگاری نگه داشته شده

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Post()
  create(@Body() dto: CreateProductImageDto) {
    return this.productImagesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Post('upload')
  @UseInterceptors(imageUploadInterceptor)
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.productImagesService.handleUploadedFile(file);
  }

  @Get()
  findAll() {
    return this.productImagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', PersianImageIdPipe) id: number) {
    return this.productImagesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Patch(':id')
  update(
    @Param('id', PersianImageIdPipe) id: number,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productImagesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE)
  @Delete(':id')
  remove(@Param('id', PersianImageIdPipe) id: number) {
    return this.productImagesService.remove(id);
  }
}