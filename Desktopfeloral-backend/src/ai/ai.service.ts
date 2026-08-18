import { Injectable } from '@nestjs/common';

import { StableDiffusionProvider } from './providers/stable-diffusion.provider';


@Injectable()
export class AiService {

  constructor(
    private readonly aiProvider: StableDiffusionProvider,
  ) {}


  async generateTryOn(
    imageUrl: string,
    shadeColor: string,
    region: string,
  ) {


    const prompt = `
    Apply beauty product color ${shadeColor}
    on ${region}.
    
    Preserve person's identity,
    facial structure,
    skin texture,
    lighting,
    and make result realistic.
    `;


    return this.aiProvider.generateTryOnImage(
      imageUrl,
      prompt,
    );

  }

}