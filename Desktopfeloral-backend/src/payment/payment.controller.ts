import { Controller, Post, Query, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { User } from '../auth/decorators/user.decorator';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('request')
  request(@Body() body: { orderId: number }, @User() user: any) {
    return this.paymentService.createPayment(body.orderId, user.id);
  }

  @Post('verify')
  verify(@Query('Authority') authority: string, @Body('orderId') orderId: number) {
    return this.paymentService.verifyPayment(authority, orderId);
  }
}