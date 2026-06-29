import {
  Body,
  Controller,
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
  request(
    @Body() dto: CreatePaymentDto,
    @User() user: AuthUser,
  ) {
    return this.paymentService.createPayment(dto.orderId, user.id);
  }

  @Post('verify')
  verify(
    @Query('Authority') authority: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentService.verifyPayment(authority, dto.orderId);
  }
}