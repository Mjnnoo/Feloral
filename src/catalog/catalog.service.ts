import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CatalogQuery = {
  page?: string;
  limit?: string;
  search?: string;
  brand?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  hasDiscount?: string;
  sort?: string;
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: unknown, fallback: number): number {
    const number = Number(value);

    if (Number.isNaN(number) || number <= 0) {
      return fallback;
    }

    return number;
  }

  private parseBoolean(value?: string): boolean | undefined {
    if (value === undefined) return undefined;

    const normalized = String(value).trim().toLowerCase();

    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;

    return undefined;
  }

  private getFinalPrice(
    price: Prisma.Decimal,
    salePrice?: Prisma.Decimal | null,
  ) {
    const originalPrice = Number(price);
    const discountPrice = salePrice ? Number(salePrice) : null;

    const finalPrice =
      discountPrice && discountPrice > 0 && discountPrice < originalPrice
        ? discountPrice
        : originalPrice;

    const discountPercent =
      finalPrice < originalPrice
        ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
        : 0;

    return {
      originalPrice,
      salePrice: discountPrice,
      finalPrice,
      discountPercent,
      hasDiscount: discountPercent > 0,
    };
  }

  private formatProduct(product: any) {
    const primaryImage =
      product.images?.find((image: any) => image.isPrimary)?.imageUrl ||
      product.images?.[0]?.imageUrl ||
      null;

    const activeVariants =
      product.variants?.filter((variant: any) => variant.isActive) || [];

    const prices = activeVariants.map((variant: any) =>
      this.getFinalPrice(variant.price, variant.salePrice),
    );

    const minFinalPrice = prices.length
      ? Math.min(...prices.map((item: any) => item.finalPrice))
      : null;

    const maxFinalPrice = prices.length
      ? Math.max(...prices.map((item: any) => item.finalPrice))
      : null;

    const maxDiscountPercent = prices.length
      ? Math.max(...prices.map((item: any) => item.discountPercent))
      : 0;

    const totalStock = activeVariants.reduce(
      (sum: number, variant: any) => sum + Number(variant.stock || 0),
      0,
    );

    const variants = activeVariants.map((variant: any) => {
      const priceInfo = this.getFinalPrice(variant.price, variant.salePrice);

      return {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        volume: variant.volume,
        barcode: variant.barcode,
        stock: variant.stock,
        isActive: variant.isActive,
        isInStock: variant.stock > 0,
        ...priceInfo,
      };
    });

    return {
      id: product.id,
      name: product.name,
      englishName: product.englishName,
      slug: product.slug,
      shortDesc: product.shortDesc,
      description: product.description,
      isActive: product.isActive,

      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
            logo: product.brand.logo,
          }
        : null,

      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
            image: product.category.image,
          }
        : null,

      primaryImage,

      images:
        product.images?.map((image: any) => ({
          id: image.id,
          imageUrl: image.imageUrl,
          alt: image.alt,
          isPrimary: image.isPrimary,
          sortOrder: image.sortOrder,
        })) || [],

      variants,

      priceRange: {
        min: minFinalPrice,
        max: maxFinalPrice,
        hasRange:
          minFinalPrice !== null &&
          maxFinalPrice !== null &&
          minFinalPrice !== maxFinalPrice,
      },

      totalStock,
      isInStock: totalStock > 0,
      hasDiscount: variants.some((variant: any) => variant.hasDiscount),
      maxDiscountPercent,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private sortProducts(products: any[], sort?: string) {
    const sorted = [...products];

    switch (sort) {
      case 'oldest':
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime(),
        );

      case 'name':
        return sorted.sort((a, b) =>
          String(a.name).localeCompare(String(b.name)),
        );

      case 'price_asc':
        return sorted.sort((a, b) => {
          const aPrice = a.priceRange.min ?? Number.MAX_SAFE_INTEGER;
          const bPrice = b.priceRange.min ?? Number.MAX_SAFE_INTEGER;
          return aPrice - bPrice;
        });

      case 'price_desc':
        return sorted.sort((a, b) => {
          const aPrice = a.priceRange.min ?? 0;
          const bPrice = b.priceRange.min ?? 0;
          return bPrice - aPrice;
        });

      case 'discount_desc':
        return sorted.sort(
          (a, b) =>
            Number(b.maxDiscountPercent || 0) -
            Number(a.maxDiscountPercent || 0),
        );

      case 'newest':
      default:
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        );
    }
  }

  async getHome() {
    const [newestProducts, allProducts, brands, categories] =
      await this.prisma.$transaction([
        this.prisma.product.findMany({
          where: {
            isActive: true,
            brand: {
              isActive: true,
            },
            category: {
              isActive: true,
            },
          },
          take: 8,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            brand: true,
            category: true,
            variants: {
              orderBy: {
                id: 'asc',
              },
            },
            images: {
              orderBy: [
                {
                  isPrimary: 'desc',
                },
                {
                  sortOrder: 'asc',
                },
                {
                  id: 'asc',
                },
              ],
            },
          },
        }),

        this.prisma.product.findMany({
          where: {
            isActive: true,
            brand: {
              isActive: true,
            },
            category: {
              isActive: true,
            },
          },
          include: {
            brand: true,
            category: true,
            variants: {
              orderBy: {
                id: 'asc',
              },
            },
            images: {
              orderBy: [
                {
                  isPrimary: 'desc',
                },
                {
                  sortOrder: 'asc',
                },
                {
                  id: 'asc',
                },
              ],
            },
          },
        }),

        this.prisma.brand.findMany({
          where: {
            isActive: true,
            products: {
              some: {
                isActive: true,
              },
            },
          },
          take: 12,
          orderBy: {
            name: 'asc',
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        }),

        this.prisma.category.findMany({
          where: {
            isActive: true,
            products: {
              some: {
                isActive: true,
              },
            },
          },
          take: 12,
          orderBy: {
            name: 'asc',
          },
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
          },
        }),
      ]);

    const formattedProducts = allProducts.map((product) =>
      this.formatProduct(product),
    );

    const discountedProducts = formattedProducts
      .filter((product) => product.hasDiscount)
      .sort(
        (a, b) =>
          Number(b.maxDiscountPercent || 0) -
          Number(a.maxDiscountPercent || 0),
      )
      .slice(0, 8);

    const perfumeProducts = formattedProducts
      .filter((product) => product.category?.slug === 'perfume')
      .slice(0, 8);

    const skinCareProducts = formattedProducts
      .filter((product) => product.category?.slug === 'skin-care')
      .slice(0, 8);

    return {
      hero: {
        title: 'Feloral',
        subtitle: 'Discover Beauty, Scent & Smart Shopping',
        description:
          'فروشگاه هوشمند عطر، آرایشی و مراقبت پوست با تجربه خرید شخصی‌سازی‌شده',
      },

      sections: {
        newestProducts: newestProducts.map((product) =>
          this.formatProduct(product),
        ),
        discountedProducts,
        perfumeProducts,
        skinCareProducts,
      },

      brands,
      categories,
    };
  }

  async getSearchSuggestions(q?: string) {
    const query = String(q || '').trim();

    if (!query || query.length < 2) {
      return {
        query,
        products: [],
        brands: [],
        categories: [],
      };
    }

    const [products, brands, categories] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              englishName: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              slug: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        take: 6,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          brand: true,
          category: true,
          variants: {
            orderBy: {
              id: 'asc',
            },
          },
          images: {
            orderBy: [
              {
                isPrimary: 'desc',
              },
              {
                sortOrder: 'asc',
              },
              {
                id: 'asc',
              },
            ],
          },
        },
      }),

      this.prisma.brand.findMany({
        where: {
          isActive: true,
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              slug: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
      }),

      this.prisma.category.findMany({
        where: {
          isActive: true,
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              slug: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
        },
      }),
    ]);

    return {
      query,
      products: products.map((product) => this.formatProduct(product)),
      brands,
      categories,
    };
  }

  async getFilters() {
    const [brands, categories, variants] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where: {
          isActive: true,
          products: {
            some: {
              isActive: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
      }),

      this.prisma.category.findMany({
        where: {
          isActive: true,
          products: {
            some: {
              isActive: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
        },
      }),

      this.prisma.productVariant.findMany({
        where: {
          isActive: true,
          product: {
            isActive: true,
            brand: {
              isActive: true,
            },
            category: {
              isActive: true,
            },
          },
        },
        select: {
          price: true,
          salePrice: true,
          stock: true,
        },
      }),
    ]);

    const finalPrices = variants.map((variant) => {
      const priceInfo = this.getFinalPrice(variant.price, variant.salePrice);
      return priceInfo.finalPrice;
    });

    const minPrice = finalPrices.length ? Math.min(...finalPrices) : 0;
    const maxPrice = finalPrices.length ? Math.max(...finalPrices) : 0;

    return {
      brands,
      categories,
      priceRange: {
        min: minPrice,
        max: maxPrice,
      },
      stock: {
        inStockCount: variants.filter((variant) => variant.stock > 0).length,
        outOfStockCount: variants.filter((variant) => variant.stock <= 0).length,
      },
      sortOptions: [
        {
          label: 'جدیدترین',
          value: 'newest',
        },
        {
          label: 'قدیمی‌ترین',
          value: 'oldest',
        },
        {
          label: 'نام محصول',
          value: 'name',
        },
        {
          label: 'ارزان‌ترین',
          value: 'price_asc',
        },
        {
          label: 'گران‌ترین',
          value: 'price_desc',
        },
        {
          label: 'بیشترین تخفیف',
          value: 'discount_desc',
        },
      ],
    };
  }

  async getProducts(query: CatalogQuery) {
    const page = this.toNumber(query.page, 1);
    const limit = Math.min(this.toNumber(query.limit, 12), 50);

    const minPrice =
      query.minPrice && !Number.isNaN(Number(query.minPrice))
        ? Number(query.minPrice)
        : undefined;

    const maxPrice =
      query.maxPrice && !Number.isNaN(Number(query.maxPrice))
        ? Number(query.maxPrice)
        : undefined;

    const inStock = this.parseBoolean(query.inStock);
    const hasDiscount = this.parseBoolean(query.hasDiscount);

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      brand: {
        isActive: true,
      },
      category: {
        isActive: true,
      },
    };

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          englishName: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (query.brand) {
      where.brand = {
        slug: query.brand,
        isActive: true,
      };
    }

    if (query.category) {
      where.category = {
        slug: query.category,
        isActive: true,
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        brand: true,
        category: true,
        variants: {
          orderBy: {
            id: 'asc',
          },
        },
        images: {
          orderBy: [
            {
              isPrimary: 'desc',
            },
            {
              sortOrder: 'asc',
            },
            {
              id: 'asc',
            },
          ],
        },
      },
    });

    let formattedProducts = products.map((product) =>
      this.formatProduct(product),
    );

    if (inStock === true) {
      formattedProducts = formattedProducts.filter(
        (product) => product.isInStock,
      );
    }

    if (inStock === false) {
      formattedProducts = formattedProducts.filter(
        (product) => !product.isInStock,
      );
    }

    if (hasDiscount === true) {
      formattedProducts = formattedProducts.filter(
        (product) => product.hasDiscount,
      );
    }

    if (hasDiscount === false) {
      formattedProducts = formattedProducts.filter(
        (product) => !product.hasDiscount,
      );
    }

    if (minPrice !== undefined) {
      formattedProducts = formattedProducts.filter(
        (product) =>
          product.priceRange.min !== null && product.priceRange.min >= minPrice,
      );
    }

    if (maxPrice !== undefined) {
      formattedProducts = formattedProducts.filter(
        (product) =>
          product.priceRange.min !== null && product.priceRange.min <= maxPrice,
      );
    }

    formattedProducts = this.sortProducts(formattedProducts, query.sort);

    const total = formattedProducts.length;
    const skip = (page - 1) * limit;
    const paginatedProducts = formattedProducts.slice(skip, skip + limit);

    return {
      data: paginatedProducts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      filters: {
        search: query.search || null,
        brand: query.brand || null,
        category: query.category || null,
        minPrice: minPrice ?? null,
        maxPrice: maxPrice ?? null,
        inStock: inStock ?? null,
        hasDiscount: hasDiscount ?? null,
        sort: query.sort || 'newest',
      },
    };
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
      },
      include: {
        brand: true,
        category: true,
        variants: {
          orderBy: {
            id: 'asc',
          },
        },
        images: {
          orderBy: [
            {
              isPrimary: 'desc',
            },
            {
              sortOrder: 'asc',
            },
            {
              id: 'asc',
            },
          ],
        },
      },
    });

    if (!product) {
      throw new NotFoundException('محصول پیدا نشد');
    }

    const relatedProducts = await this.prisma.product.findMany({
      where: {
        id: {
          not: product.id,
        },
        isActive: true,
        OR: [
          {
            categoryId: product.categoryId,
          },
          {
            brandId: product.brandId,
          },
        ],
        brand: {
          isActive: true,
        },
        category: {
          isActive: true,
        },
      },
      take: 8,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        brand: true,
        category: true,
        variants: {
          orderBy: {
            id: 'asc',
          },
        },
        images: {
          orderBy: [
            {
              isPrimary: 'desc',
            },
            {
              sortOrder: 'asc',
            },
            {
              id: 'asc',
            },
          ],
        },
      },
    });

    return {
      ...this.formatProduct(product),
      relatedProducts: relatedProducts.map((item) => this.formatProduct(item)),
    };
  }
}