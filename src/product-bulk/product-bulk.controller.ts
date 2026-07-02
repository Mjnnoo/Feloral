import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { ProductBulkService } from './product-bulk.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('product-bulk')
export class ProductBulkController {
  constructor(private readonly productBulkService: ProductBulkService) {}

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(@UploadedFile() file: Express.Multer.File) {
    return this.productBulkService.previewImport(file);
  }

  @Post('import/confirm')
  async confirmImport(@Body('rows') rows: any[]) {
    return this.productBulkService.confirmImport(rows);
  }

  @Post('update/preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewUpdate(@UploadedFile() file: Express.Multer.File) {
    return this.productBulkService.previewUpdate(file);
  }

  @Post('update/confirm')
  async confirmUpdate(@Body('rows') rows: any[]) {
    return this.productBulkService.confirmUpdate(rows);
  }

  @Get('export')
  async exportProducts(@Res() res: Response) {
    const buffer = await this.productBulkService.exportProducts();

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="feloral-products.xlsx"',
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return res.send(buffer);
  }

  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.productBulkService.downloadTemplate();

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="feloral-product-template.xlsx"',
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return res.send(buffer);
  }

  @Get('update-template')
  async downloadUpdateTemplate(@Res() res: Response) {
    const buffer = await this.productBulkService.downloadUpdateTemplate();

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="feloral-product-update-template.xlsx"',
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return res.send(buffer);
  }
}