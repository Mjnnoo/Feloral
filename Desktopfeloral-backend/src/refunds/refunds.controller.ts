import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { RefundQueryDto } from './dto/refund-query.dto';
import { UpdateRefundStatusDto } from './dto/update-refund-status.dto';
import { RefundsService } from './refunds.service';

@Controller('refunds/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin', 'manager')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  list(@Query() query: RefundQueryDto) {
    return this.refundsService.adminList(query);
  }

  @Patch(':id/status')
  updateStatus(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRefundStatusDto,
  ) {
    return this.refundsService.updateStatus(id, user.id, dto);
  }
}
