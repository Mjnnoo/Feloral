import { Test, TestingModule } from '@nestjs/testing';
import { VirtualTryOnController } from './virtual-try-on.controller';

describe('VirtualTryOnController', () => {
  let controller: VirtualTryOnController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VirtualTryOnController],
    }).compile();

    controller = module.get<VirtualTryOnController>(VirtualTryOnController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
