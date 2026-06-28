import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@User() user: any) {
    return this.cartService.getCart(user.id);
  }

  @Post('add')
  addToCart(
    @User() user: any,
    @Body() body: { variantId: number; quantity: number },
  ) {
    return this.cartService.addToCart(
      user.id,
      body.variantId,
      body.quantity,
    );
  }

  @Delete(':id')
  removeItem(@User() user: any, @Param('id') id: string) {
    return this.cartService.removeItem(user.id, Number(id));
  }

  @Post('clear')
  clearCart(@User() user: any) {
    return this.cartService.clearCart(user.id);
  }
}