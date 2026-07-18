import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PostexClient } from './postex.client';

describe('PostexClient', () => {
  let client: PostexClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostexClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: unknown) =>
              key === 'POSTEX_ENABLED' ? 'false' : fallback,
            ),
          },
        },
      ],
    }).compile();

    client = module.get<PostexClient>(PostexClient);
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  it('blocks outbound requests when integration is disabled', async () => {
    await expect(client.testConnection()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
