import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { StableDiffusionProvider } from './providers/stable-diffusion.provider';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: StableDiffusionProvider,
          useValue: {
            generateTryOnImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});