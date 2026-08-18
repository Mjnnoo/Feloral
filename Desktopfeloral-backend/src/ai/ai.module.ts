import { Module } from '@nestjs/common';

import { AiService } from './ai.service';

import { StableDiffusionProvider } from './providers/stable-diffusion.provider';


@Module({

  providers:[
    AiService,
    StableDiffusionProvider,
  ],

  exports:[
    AiService,
  ],

})
export class AiModule {}