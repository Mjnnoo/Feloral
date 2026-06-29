import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { BeautyProfileService } from './beauty-profile.service';
import { UpsertBeautyProfileDto } from './dto/upsert-beauty-profile.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { RolesGuard } from '../auth/roles/roles.guard';

@Controller('beauty-profile')
export class BeautyProfileController {
  constructor(
    private readonly beautyProfileService: BeautyProfileService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@Req() request: any) {
    return this.beautyProfileService.getMyProfile(
      request.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  upsertMyProfile(
    @Req() request: any,
    @Body() dto: UpsertBeautyProfileDto,
  ) {
    return this.beautyProfileService.upsertMyProfile(
      request.user.id,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteMyProfile(@Req() request: any) {
    return this.beautyProfileService.deleteMyProfile(
      request.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('admin/all')
  getAllForAdmin() {
    return this.beautyProfileService.getAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('admin/users/:userId')
  getByUserForAdmin(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.beautyProfileService.getByUserForAdmin(userId);
  }
}