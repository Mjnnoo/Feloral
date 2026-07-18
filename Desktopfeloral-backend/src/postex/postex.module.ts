import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PostexClient } from './postex.client';
import { PostexController, PostexWebhookController } from './postex.controller';
import { PostexService } from './postex.service';

@Module({
  imports: [PrismaModule],
  controllers: [PostexController, PostexWebhookController],
  providers: [PostexClient, PostexService],
  exports: [PostexClient, PostexService],
})
export class PostexModule {}
