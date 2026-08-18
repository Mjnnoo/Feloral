import { Test, TestingModule } from '@nestjs/testing';
import { VirtualTryOnService } from './virtual-try-on.service';

describe('VirtualTryOnService', () => {
  let service: VirtualTryOnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VirtualTryOnService],
    }).compile();

    service = module.get<VirtualTryOnService>(VirtualTryOnService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
