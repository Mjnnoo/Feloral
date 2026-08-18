import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { AiProvider } from './ai-provider.interface';


@Injectable()
export class StableDiffusionProvider
implements AiProvider {


  private readonly token =
    process.env.REPLICATE_API_TOKEN;



  async generateTryOnImage(
    imageUrl: string,
    prompt: string,
    maskUrl?: string,
  ) {


    const response =
      await axios.post(

        'https://api.replicate.com/v1/predictions',

        {
          version:
            'MODEL_VERSION_ID',

          input:{

            image:
              imageUrl,

            prompt,

            mask:
              maskUrl,

          },

        },


        {

          headers:{

            Authorization:
              `Bearer ${this.token}`,

            'Content-Type':
              'application/json',

          },

        },

      );



    return {

      imageUrl:
        response.data.urls.get,

    };


  }


}