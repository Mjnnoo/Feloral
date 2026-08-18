import { Test, TestingModule } from '@nestjs/testing';
import { VirtualTryOnController } from './virtual-try-on.controller';
import { VirtualTryOnService } from './virtual-try-on.service';
import { WorkerService } from './worker/worker.service';

describe('VirtualTryOnController', () => {
  let controller: VirtualTryOnController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VirtualTryOnController],
      providers: [
        {
          provide: VirtualTryOnService,
          useValue: {},
        },
        {
          provide: WorkerService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<VirtualTryOnController>(VirtualTryOnController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});