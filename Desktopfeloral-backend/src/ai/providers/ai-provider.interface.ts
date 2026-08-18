export interface AiProvider {

  generateTryOnImage(
    imageUrl: string,
    prompt: string,
    maskUrl?: string,
  ): Promise<{
    imageUrl:string;
  }>;

}