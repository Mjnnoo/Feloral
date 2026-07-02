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

import { PaymentService } from './payment.service';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

type AuthUser = {
  id: number;
  mobile: string;
  role: string;
};

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('request')
  requestWithBody(@Body() dto: CreatePaymentDto, @User() user: AuthUser) {
    return this.paymentService.createPayment(dto.orderId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('request/:orderId')
  requestWithParam(
    @Param('orderId', ParseIntPipe) orderId: number,
    @User() user: AuthUser,
  ) {
    return this.paymentService.createPayment(orderId, user.id);
  }

  @Post('verify')
  verifyWithPost(
    @Query('Authority') authority: string,
    @Query('Status') queryStatus: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentService.verifyPayment(
      authority,
      dto.orderId,
      dto.status || queryStatus,
    );
  }

  @Get('verify')
  verifyWithGet(
    @Query('Authority') authority: string,
    @Query('Status') status: string,
    @Query('orderId') orderId: string,
  ) {
    return this.paymentService.verifyPayment(
      authority,
      Number(orderId),
      status,
    );
  }

  @Get('mock-pay')
  mockPay(
    @Query('Authority') authority: string,
    @Query('orderId') orderId: string,
    @Query('Status') status?: string,
  ) {
    return this.paymentService.verifyPayment(
      authority,
      Number(orderId),
      status || 'OK',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-payments')
  getMyPayments(@User() user: AuthUser) {
    return this.paymentService.getMyPayments(user.id);
  }
}