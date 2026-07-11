import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CmsPublicController } from './cms-public.controller';
import { CmsAdminController } from './cms-admin.controller';
import { CmsService } from './cms.service';

@Module({
  imports: [PrismaModule],
  controllers: [CmsPublicController, CmsAdminController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
