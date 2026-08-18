import { Test, TestingModule } from '@nestjs/testing';
import { WorkerService } from './worker.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';

describe('WorkerService', () => {
  let service: WorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: AiService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<WorkerService>(WorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});