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

import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@User() user: AuthenticatedUser) {
    return this.cartService.getCart(user.id);
  }

  @Post('add')
  addToCart(@User() user: AuthenticatedUser, @Body() dto: CreateCartDto) {
    return this.cartService.addToCart(user.id, dto.variantId, dto.quantity);
  }

  @Patch(':id')
  updateQuantity(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateQuantity(user.id, id, dto.quantity);
  }

  @Delete(':id')
  removeItem(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cartService.removeItem(user.id, id);
  }

  @Post('clear')
  clearCart(@User() user: AuthenticatedUser) {
    return this.cartService.clearCart(user.id);
  }
}
