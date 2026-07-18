import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { PostexClient } from './postex.client';
import { PostexService } from './postex.service';

describe('PostexService', () => {
  let service: PostexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostexService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: PostexClient,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PostexService>(PostexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects webhook calls when no secret is configured', async () => {
    await expect(
      service.handleWebhook({ shipmentId: 'PX-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
