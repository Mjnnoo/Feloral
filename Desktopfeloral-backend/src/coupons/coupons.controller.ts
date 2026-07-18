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
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  validate(@User() user: AuthenticatedUser, @Body() dto: ValidateCouponDto) {
    return this.couponsService.validateForUser(user.id, dto.code);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'support')
  adminList() {
    return this.couponsService.adminList();
  }

  @Post('admin')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager')
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.deactivate(id);
  }
}
