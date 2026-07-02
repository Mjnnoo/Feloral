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
  UseGuards,
} from '@nestjs/common';

import { CouponsService } from './coupons.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { Role } from '../auth/enums/role.enum';

import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { UpdateCouponActiveDto } from './dto/update-coupon-active.dto';

type AuthUser = {
  id: number;
  mobile: string;
  role: string;
};

const PersianIdPipe = new ParseIntPipe({
  exceptionFactory: () => {
    return new BadRequestException('شناسه کوپن باید عدد باشد');
  },
});

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('validate')
  validateCoupon(@User() user: AuthUser, @Body() dto: ValidateCouponDto) {
    return this.couponsService.validateForUserCart(user.id, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-usages')
  getMyUsages(@User() user: AuthUser) {
    return this.couponsService.getMyUsages(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
  @Get('admin')
  getCoupons(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.couponsService.findAll({
      page,
      limit,
      search,
      isActive,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT)
  @Get('admin/:id')
  getCoupon(@Param('id', PersianIdPipe) id: number) {
    return this.couponsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/:id/active')
  updateCouponActive(
    @Param('id', PersianIdPipe) id: number,
    @Body() dto: UpdateCouponActiveDto,
  ) {
    return this.couponsService.updateActive(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/:id')
  updateCoupon(
    @Param('id', PersianIdPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('admin/:id')
  removeCoupon(@Param('id', PersianIdPipe) id: number) {
    return this.couponsService.remove(id);
  }
}