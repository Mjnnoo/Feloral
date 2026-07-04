import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { PostexService } from './postex.service';
import { PostexTestRequestDto } from './dto/postex-test-request.dto';
import { PostexQuoteDto } from './dto/postex-quote.dto';
import { ShippingQuoteDto } from './dto/shipping-quote.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingController {
  constructor(private readonly postexService: PostexService) {}

  @Get('postex/config')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  getPostexConfig() {
    return this.postexService.getConfigStatus();
  }

  @Get('postex/cities')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CUSTOMER)
  searchPostexCities(
    @Query('keyword') keyword: string,
    @Query('direction') direction?: 'from' | 'to',
  ) {
    return this.postexService.searchCities(keyword, direction || 'to');
  }

  @Post('quote')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CUSTOMER)
  getShippingQuote(@Body() dto: ShippingQuoteDto) {
    return this.postexService.getCustomerShippingQuote(dto);
  }

  @Post('postex/test')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  testPostex(@Body() dto: PostexTestRequestDto) {
    return this.postexService.request(
      dto.path,
      dto.method || 'GET',
      dto.body,
    );
  }

  @Post('postex/quote-test')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  getPostexQuoteTest(@Body() dto: PostexQuoteDto) {
    return this.postexService.getShippingQuote(dto);
  }
}