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

import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type AuthUser = {
  id: number;
  mobile: string;
  role: string;
};

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@User() user: AuthUser) {
    return this.cartService.getCart(user.id);
  }

  @Post('add')
  addToCart(
    @User() user: AuthUser,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addToCart(
      user.id,
      dto.variantId,
      dto.quantity,
    );
  }

  @Patch('items/:id')
  updateQuantity(
    @User() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateQuantity(
      user.id,
      id,
      dto.quantity,
    );
  }

  @Delete('items/:id')
  removeItem(
    @User() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cartService.removeItem(user.id, id);
  }

  @Delete('clear')
  clearCart(@User() user: AuthUser) {
    return this.cartService.clearCart(user.id);
  }
}