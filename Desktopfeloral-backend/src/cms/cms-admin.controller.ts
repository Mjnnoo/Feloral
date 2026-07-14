import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

import { CmsService } from './cms.service';
import { UpdateContentDto } from './dto/update-content.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { UpsertContentDto } from './dto/upsert-content.dto';
import { UpsertMediaUrlDto } from './dto/upsert-media-url.dto';
import { UpsertSectionDto } from './dto/upsert-section.dto';

const cmsUploadStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'cms'),
  filename: (_req, file, callback) => {
    const safeBaseName =
      file.originalname
        ?.replace(extname(file.originalname), '')
        ?.replace(/[^a-zA-Z0-9-_]/g, '-')
        ?.slice(0, 60) || 'cms-media';

    callback(null, `${safeBaseName}-${Date.now()}${extname(file.originalname)}`);
  },
});

@Controller('cms/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin', 'editor', 'seo', 'ai')
export class CmsAdminController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('homepage')
  getAdminHomepage() {
    return this.cmsService.getAdminHomepage();
  }

  @Post('seed-homepage')
  seedHomepage() {
    return this.cmsService.seedDefaultHomepage();
  }

  @Get('contents')
  getContents() {
    return this.cmsService.getContents();
  }

  @Post('contents')
  upsertContent(@Body() dto: UpsertContentDto) {
    return this.cmsService.upsertContent(dto);
  }

  @Patch('contents/:key')
  updateContent(@Param('key') key: string, @Body() dto: UpdateContentDto) {
    return this.cmsService.updateContent(key, dto);
  }

  @Get('sections')
  getSections() {
    return this.cmsService.getSections();
  }

  @Post('sections')
  upsertSection(@Body() dto: UpsertSectionDto) {
    return this.cmsService.upsertSection(dto);
  }

  @Patch('sections/:key')
  updateSection(@Param('key') key: string, @Body() dto: UpdateSectionDto) {
    return this.cmsService.updateSection(key, dto);
  }

  @Get('theme')
  getTheme() {
    return this.cmsService.getTheme();
  }

  @Patch('theme')
  updateTheme(@Body() dto: UpdateThemeDto) {
    return this.cmsService.updateTheme(dto);
  }

  @Post('media-url')
  upsertMediaUrl(@Body() dto: UpsertMediaUrlDto) {
    return this.cmsService.upsertMediaUrl(dto);
  }

  @Post('media/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: cmsUploadStorage,
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  uploadMedia(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.cmsService.createUploadedMedia(file, body);
  }
}
