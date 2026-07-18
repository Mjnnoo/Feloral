import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PostexCityQueryDto } from './dto/postex-city-query.dto';
import { PostexQuoteDto } from './dto/postex-quote.dto';
import { UpsertShippingOriginDto } from './dto/upsert-shipping-origin.dto';
import { PostexService } from './postex.service';

@Controller('shipping/postex')
@UseGuards(JwtAuthGuard)
export class PostexController {
  constructor(private readonly postexService: PostexService) {}

  @Get('cities')
  cities(@Query() query: PostexCityQueryDto) {
    return this.postexService.searchCities(query.search, query.province);
  }

  @Get('box-types')
  boxTypes() {
    return this.postexService.boxTypes();
  }

  @Post('quotes')
  quote(@User() user: AuthenticatedUser, @Body() dto: PostexQuoteDto) {
    return this.postexService.quote(user.id, dto);
  }

  @Get('orders/:id/tracking')
  trackForUser(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.postexService.trackForUser(id, user.id);
  }

  @Get('admin/origins')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'warehouse')
  adminListOrigins() {
    return this.postexService.adminListOrigins();
  }

  @Put('admin/origin')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  upsertOrigin(@Body() dto: UpsertShippingOriginDto) {
    return this.postexService.upsertOrigin(dto);
  }

  @Delete('admin/origins/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  deactivateOrigin(@Param('id', ParseIntPipe) id: number) {
    return this.postexService.deactivateOrigin(id);
  }

  @Post('admin/test-connection')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  testConnection() {
    return this.postexService.testConnection();
  }

  @Post('admin/orders/:id/create-shipment')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'warehouse')
  createShipment(@Param('id', ParseIntPipe) id: number) {
    return this.postexService.ensureShipmentForPaidOrder(id);
  }

  @Post('admin/orders/:id/sync')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'support', 'warehouse')
  syncOrder(@Param('id', ParseIntPipe) id: number) {
    return this.postexService.trackOrder(id);
  }

  @Post('admin/orders/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager')
  cancelShipment(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    return this.postexService.cancelShipment(id, user.id, body?.reason);
  }

  @Post('admin/sync')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin', 'manager', 'warehouse')
  syncStale(@Query('limit') limit?: string) {
    return this.postexService.syncStale(Number(limit) || 25);
  }
}

@Controller('webhooks/postex')
export class PostexWebhookController {
  constructor(private readonly postexService: PostexService) {}

  @Post('shipment')
  shipmentWebhook(
    @Body() payload: unknown,
    @Headers('x-postex-signature') signature?: string,
    @Headers('x-postex-webhook-secret') plainSecret?: string,
  ) {
    return this.postexService.handleWebhook(payload, signature, plainSecret);
  }
}
