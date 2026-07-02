import { Test, TestingModule } from '@nestjs/testing';
import { ProductBulkController } from './product-bulk.controller';

describe('ProductBulkController', () => {
  let controller: ProductBulkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductBulkController],
    }).compile();

    controller = module.get<ProductBulkController>(ProductBulkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
