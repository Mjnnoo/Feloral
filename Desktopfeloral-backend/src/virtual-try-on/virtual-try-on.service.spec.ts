import { Test, TestingModule } from '@nestjs/testing';
import { VirtualTryOnService } from './virtual-try-on.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { JobService } from './job/job.service';

describe('VirtualTryOnService', () => {
  let service: VirtualTryOnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualTryOnService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: StorageService,
          useValue: {},
        },
        {
          provide: JobService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<VirtualTryOnService>(VirtualTryOnService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});