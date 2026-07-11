import { Controller, Get } from '@nestjs/common';

import { CmsService } from './cms.service';

@Controller('cms/public')
export class CmsPublicController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('homepage')
  getPublicHomepage() {
    return this.cmsService.getPublicHomepage();
  }

  @Get('theme')
  getPublicTheme() {
    return this.cmsService.getPublicTheme();
  }
}
