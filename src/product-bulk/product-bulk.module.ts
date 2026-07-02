import { Module } from '@nestjs/common';
import { ProductBulkService } from './product-bulk.service';
import { ProductBulkController } from './product-bulk.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductBulkController],
  providers: [ProductBulkService],
})
export class ProductBulkModule {}