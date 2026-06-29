import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { extname } from 'path';

import { VirtualTryOnService } from './virtual-try-on.service';

import { CreateTryOnSessionDto } from './dto/create-try-on-session.dto';
import { UpdateTryOnResultDto } from './dto/update-try-on-result.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { RolesGuard } from '../auth/roles/roles.guard';

@Controller('virtual-try-on')
export class VirtualTryOnController {
  constructor(
    private readonly virtualTryOnService: VirtualTryOnService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-source')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/try-on/source',
        filename: (req, file, callback) => {
          const uniqueName = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}${extname(file.originalname)}`;

          callback(null, uniqueName);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new Error('Only jpeg, png and webp images are allowed'),
            false,
          );
        }

        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadSourceImage(@UploadedFile() file: Express.Multer.File) {
    return {
      success: true,
      filename: file.filename,
      imageUrl: `/uploads/try-on/source/${file.filename}`,
      message:
        'Source image uploaded. Use imageUrl as sourceImageUrl when creating try-on session.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions')
  createSession(
    @Req() request: any,
    @Body() dto: CreateTryOnSessionDto,
  ) {
    return this.virtualTryOnService.createSession(
      request.user.id,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMySessions(@Req() request: any) {
    return this.virtualTryOnService.getMySessions(
      request.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:id')
  getMySessionById(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.virtualTryOnService.getMySessionById(
      request.user.id,
      id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('sessions/:id/result')
  updateMySessionResult(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTryOnResultDto,
  ) {
    return this.virtualTryOnService.updateMySessionResult(
      request.user.id,
      id,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  deleteMySession(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.virtualTryOnService.deleteMySession(
      request.user.id,
      id,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('admin/all')
  getAllForAdmin() {
    return this.virtualTryOnService.getAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('admin/:id')
  getByIdForAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.virtualTryOnService.getByIdForAdmin(id);
  }
}