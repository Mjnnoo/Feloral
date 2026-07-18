import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  AdminReturnNoteDto,
  ReceiveReturnDto,
  RequestReturnRefundDto,
} from './dto/admin-return-action.dto';
import { AdminReturnQueryDto } from './dto/admin-return-query.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ReturnsService } from './returns.service';

@Controller('returns')
@UseGuards(JwtAuthGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  listMine(@User() user: AuthenticatedUser) {
    return this.returnsService.listMine(user.id);
  }

  @Post()
  create(@User() user: AuthenticatedUser, @Body() dto: CreateReturnRequestDto) {
    return this.returnsService.create(user.id, dto);
  }

  @Post(':id/cancel')
  cancel(@User() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.returnsService.cancel(id, user.id);
  }

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'support', 'warehouse')
  adminList(@Query() query: AdminReturnQueryDto) {
    return this.returnsService.adminList(query);
  }

  @Post('admin/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'support')
  approve(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminReturnNoteDto) {
    return this.returnsService.approve(id, dto);
  }

  @Post('admin/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'support')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminReturnNoteDto) {
    return this.returnsService.reject(id, dto);
  }

  @Post('admin/:id/receive')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'warehouse')
  receive(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceiveReturnDto,
  ) {
    return this.returnsService.receive(id, user.id, dto);
  }

  @Post('admin/:id/request-refund')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager')
  requestRefund(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestReturnRefundDto,
  ) {
    return this.returnsService.requestRefund(id, user.id, dto);
  }

  @Get(':id')
  getMine(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.returnsService.getMine(id, user.id);
  }
}
