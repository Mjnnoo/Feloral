import { RecommendationsModule } from './recommendations/recommendations.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './auth/auth.module';

import { BrandsModule } from './brands/brands.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';

import { ProductVariantsModule } from './product-variants/product-variants.module';
import { ProductImagesModule } from './product-images/product-images.module';

import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';

import { DashboardModule } from './dashboard/dashboard.module';
import { AddressesModule } from './addresses/addresses.module';

import { ProductShadesModule } from './product-shades/product-shades.module';
import { ProductIntelligenceModule } from './product-intelligence/product-intelligence.module';
import { ProductExperienceModule } from './product-experience/product-experience.module';

import { BeautyProfileModule } from './beauty-profile/beauty-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    AuthModule,

    BrandsModule,
    CategoriesModule,
    ProductsModule,

    ProductVariantsModule,
    ProductImagesModule,

    CartModule,
    OrderModule,
    PaymentModule,

    DashboardModule,
    AddressesModule,

    ProductShadesModule,
    ProductIntelligenceModule,
    ProductExperienceModule,

    BeautyProfileModule,
    RecommendationsModule,
  ],
})
export class AppModule {}