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

import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

type AuthUser = {
  id: number;
  mobile: string;
  role: string;
};

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(
    private readonly addressesService: AddressesService,
  ) {}

  @Post()
  create(
    @User() user: AuthUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(user.id, dto);
  }

  @Get()
  findAll(@User() user: AuthUser) {
    return this.addressesService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @User() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressesService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @User() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Patch(':id/default')
  setDefault(
    @User() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressesService.setDefault(user.id, id);
  }

  @Delete(':id')
  remove(
    @User() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressesService.remove(user.id, id);
  }
}