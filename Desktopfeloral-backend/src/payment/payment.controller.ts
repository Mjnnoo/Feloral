import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentService } from './payment.service';
import {Param,ParseIntPipe,} from '@nestjs/common';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('request')
  request(@Body() dto: RequestPaymentDto, @User() user: AuthenticatedUser) {
    return this.paymentService.createPayment(dto.orderId, user.id);
  }

  @Get('verify')
  verifyRedirect(
    @Query('Authority') authority: string,
    @Query('orderId') orderId: string,
    @Query('Status') status?: string,
  ) {
    return this.paymentService.verifyPayment(
      authority,
      Number(orderId),
      status,
    );
  }

  @Post('verify')
  verifyPost(
    @Body() dto: VerifyPaymentDto,
    @Query('Authority') queryAuthority?: string,
    @Query('Status') queryStatus?: string,
  ) {
    return this.paymentService.verifyPayment(
      queryAuthority || dto.authority || '',
      dto.orderId,
      queryStatus || dto.status,
    );
  }
  @Post('mock-success/:orderId')
mockSuccess(
  @Param('orderId', ParseIntPipe) orderId: number,
) {
  return this.paymentService.mockSuccess(orderId);
}
}
