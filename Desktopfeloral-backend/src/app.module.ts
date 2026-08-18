import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { BrandsModule } from './brands/brands.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { ProductImagesModule } from './product-images/product-images.module';

import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { CmsModule } from './cms/cms.module';
import { AddressesModule } from './addresses/addresses.module';
import { ShippingModule } from './shipping/shipping.module';
import { CouponsModule } from './coupons/coupons.module';
import { ReturnsModule } from './returns/returns.module';
import { RefundsModule } from './refunds/refunds.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PostexModule } from './postex/postex.module';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/env.validation';
import { VirtualTryOnModule } from './virtual-try-on/virtual-try-on.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    PrismaModule,

    AuthModule,
    UsersModule,

    BrandsModule,
    CategoriesModule,
    ProductsModule,
    ProductVariantsModule,
    ProductImagesModule,

    CartModule,
    OrderModule,
    PaymentModule,
    AddressesModule,
    ShippingModule,
    CouponsModule,
    ReturnsModule,
    RefundsModule,
    InvoicesModule,
    PostexModule,
    CmsModule,
    VirtualTryOnModule,
    StorageModule,
    AiModule,
  ],
})
export class AppModule {}
