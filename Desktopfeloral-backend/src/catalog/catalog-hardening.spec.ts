import { BadRequestException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { BrandsService } from '../brands/brands.service';
import { ProductImagesService } from '../product-images/product-images.service';
import { ProductVariantsService } from '../product-variants/product-variants.service';
import { ProductsService } from '../products/products.service';

const actor: AuthenticatedUser = {
  id: 7,
  fullName: 'Warehouse User',
  mobile: '09120000007',
  email: null,
  role: 'warehouse',
  sessionId: 'session-7',
};

describe('Catalog core hardening', () => {
  it('soft-deactivates a brand instead of deleting it', async () => {
    const prisma: any = {
      brand: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          name: 'Brand',
          slug: 'brand',
          isActive: true,
          _count: { products: 0 },
        }),
        update: jest.fn().mockResolvedValue({ id: 1, isActive: false }),
      },
    };
    const service = new BrandsService(prisma);

    const result = await service.deactivate(1);

    expect(prisma.brand.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isActive: false },
    });
    expect(result.message).toBe('برند غیرفعال شد');
  });

  it('deactivates a product and all active variants in one transaction', async () => {
    const prisma: any = {
      product: {
        findUnique: jest.fn().mockResolvedValue({ id: 4, isActive: true }),
        update: jest.fn().mockResolvedValue({ id: 4, isActive: false }),
      },
      productVariant: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest.fn(async (operation: (tx: any) => unknown) =>
        operation(prisma),
      ),
    };
    const service = new ProductsService(prisma);

    const result = await service.deactivate(4);

    expect(prisma.productVariant.updateMany).toHaveBeenCalledWith({
      where: { productId: 4, isActive: true },
      data: { isActive: false },
    });
    expect(result.message).toContain('غیرفعال');
  });

  it('rejects a sale price greater than the regular price', async () => {
    const prisma: any = {
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 2 }),
      },
    };
    const service = new ProductVariantsService(prisma);

    await expect(
      service.create(actor, {
        title: '50ml',
        sku: 'SKU-1',
        price: 100,
        salePrice: 110,
        stock: 2,
        productId: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a zero stock adjustment', async () => {
    const service = new ProductVariantsService({} as any);

    await expect(
      service.adjustStock(actor, 1, { delta: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records every successful stock adjustment', async () => {
    const prisma: any = {
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          stock: 5,
          sku: 'SKU-1',
        }),
        update: jest.fn().mockResolvedValue({ id: 1, stock: 8 }),
      },
      stockMovement: {
        create: jest.fn().mockResolvedValue({
          id: 10,
          delta: 3,
          balanceBefore: 5,
          balanceAfter: 8,
        }),
      },
      $transaction: jest.fn(async (operation: (tx: any) => unknown) =>
        operation(prisma),
      ),
    };
    const service = new ProductVariantsService(prisma);

    const result = await service.adjustStock(actor, 1, {
      delta: 3,
      reason: 'ورود انبار',
    });

    expect(prisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: 1,
        actorUserId: actor.id,
        delta: 3,
        balanceBefore: 5,
        balanceAfter: 8,
      }),
    });
    expect(result.variant.stock).toBe(8);
  });

  it('automatically makes the first product image primary', async () => {
    const prisma: any = {
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 9 }),
      },
      productImage: {
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 1,
          ...data,
        })),
      },
      $transaction: jest.fn(async (operation: (tx: any) => unknown) =>
        operation(prisma),
      ),
    };
    const service = new ProductImagesService(prisma);

    const image = await service.create({
      productId: 9,
      imageUrl: '/uploads/products/test.webp',
    });

    expect(image.isPrimary).toBe(true);
  });
});
