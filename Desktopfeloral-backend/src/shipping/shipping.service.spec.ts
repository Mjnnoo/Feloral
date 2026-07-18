import { Test, TestingModule } from '@nestjs/testing';
import { PostexService } from '../postex/postex.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingService } from './shipping.service';

describe('ShippingService', () => {
  let service: ShippingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: PrismaService, useValue: {} },
        { provide: PostexService, useValue: {} },
      ],
    }).compile();
    service = module.get<ShippingService>(ShippingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
