import { Test, TestingModule } from '@nestjs/testing';
import { ProductBulkService } from './product-bulk.service';

describe('ProductBulkService', () => {
  let service: ProductBulkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductBulkService],
    }).compile();

    service = module.get<ProductBulkService>(ProductBulkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
