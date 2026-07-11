import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule } from '../prisma/prisma.module';
import { BrandsModule } from '../brands/brands.module';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { ProductImagesModule } from '../product-images/product-images.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from './auth.module';
import { CartModule } from '../cart/cart.module';
import { OrderModule } from '../order/order.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    PrismaModule,
    BrandsModule,
    CategoriesModule,
    ProductsModule,
    ProductVariantsModule,
    ProductImagesModule,
    UsersModule,
    AuthModule,
    CartModule,
    OrderModule,
    PaymentModule,
  ],
})
export class AppModule {}