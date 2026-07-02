import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

type PreviewRow = {
  rowNumber: number;
  valid: boolean;
  errors: string[];
  data: {
    name: string;
    englishName: string;
    slug: string;
    brandSlug: string;
    categorySlug: string;
    shortDesc: string;
    description: string;
    variantTitle: string;
    sku: string;
    volume: number | null;
    barcode: string;
    price: number;
    salePrice: number | null;
    stock: number;
    isActive: boolean;
    imageUrl: string;
    imageAlt: string;
    imageIsPrimary: boolean;
    imageSortOrder: number;
  };
};

type UpdatePreviewRow = {
  rowNumber: number;
  valid: boolean;
  errors: string[];
  current?: {
    productId: number;
    productName: string;
    productSlug: string;
    variantId: number;
    sku: string;
  };
  data: Record<string, any>;
};

@Injectable()
export class ProductBulkService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeDigits(value: unknown): string {
    const raw = String(value ?? '').trim();

    return raw
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  }

  private parseNumber(value: unknown): number | null {
    const raw = this.normalizeDigits(value)
      .replace(/,/g, '')
      .replace(/٬/g, '')
      .trim();

    if (!raw) {
      return null;
    }

    const number = Number(raw);

    return Number.isNaN(number) ? null : number;
  }

  private parseVolume(value: unknown): number | null {
    const raw = this.normalizeDigits(value);

    if (!raw) {
      return null;
    }

    const match = raw.match(/\d+/);

    if (!match) {
      return null;
    }

    return Number(match[0]);
  }

  private parseBoolean(value: unknown, defaultValue = true): boolean {
    const raw = String(value ?? '').trim().toLowerCase();

    if (!raw) {
      return defaultValue;
    }

    if (['true', '1', 'yes', 'active', 'فعال', 'بله'].includes(raw)) {
      return true;
    }

    if (['false', '0', 'no', 'inactive', 'غیرفعال', 'خیر'].includes(raw)) {
      return false;
    }

    return defaultValue;
  }

  private isEmptyCell(value: unknown): boolean {
    return value === undefined || value === null || String(value).trim() === '';
  }

  async previewImport(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('فایل اکسل ارسال نشده است');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
    }) as Record<string, unknown>[];

    if (!rows.length) {
      throw new BadRequestException('فایل اکسل خالی است');
    }

    const preview: PreviewRow[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;
      const errors: string[] = [];

      const name = String(row.name || '').trim();
      const englishName = String(row.englishName || '').trim();
      const slug = String(row.slug || '').trim();
      const brandSlug = String(row.brandSlug || '').trim();
      const categorySlug = String(row.categorySlug || '').trim();
      const shortDesc = String(row.shortDesc || '').trim();
      const description = String(row.description || '').trim();
      const variantTitle = String(row.variantTitle || '').trim();
      const sku = String(row.sku || '').trim();
      const volume = this.parseVolume(row.volume);
      const barcode = String(row.barcode || '').trim();
      const price = this.parseNumber(row.price);
      const salePrice = this.parseNumber(row.salePrice);
      const stock = this.parseNumber(row.stock) ?? 0;
      const isActive = this.parseBoolean(row.isActive, true);

      const imageUrl = String(row.imageUrl || '').trim();
      const imageAlt = String(row.imageAlt || '').trim();
      const imageIsPrimary = this.parseBoolean(row.imageIsPrimary, true);
      const imageSortOrder = this.parseNumber(row.imageSortOrder) ?? 0;

      if (!name) errors.push('نام محصول وارد نشده است');
      if (!slug) errors.push('اسلاگ محصول وارد نشده است');
      if (!brandSlug) errors.push('اسلاگ برند وارد نشده است');
      if (!categorySlug) errors.push('اسلاگ دسته‌بندی وارد نشده است');
      if (!variantTitle) errors.push('عنوان تنوع وارد نشده است');
      if (!sku) errors.push('SKU وارد نشده است');
      if (price === null || price <= 0) errors.push('قیمت نامعتبر است');

      if (salePrice !== null && salePrice < 0) {
        errors.push('قیمت تخفیف نامعتبر است');
      }

      if (stock < 0) {
        errors.push('موجودی نامعتبر است');
      }

      if (imageSortOrder < 0) {
        errors.push('ترتیب عکس نامعتبر است');
      }

      const brand = brandSlug
        ? await this.prisma.brand.findUnique({ where: { slug: brandSlug } })
        : null;

      const category = categorySlug
        ? await this.prisma.category.findUnique({
            where: { slug: categorySlug },
          })
        : null;

      const existingProduct = slug
        ? await this.prisma.product.findUnique({ where: { slug } })
        : null;

      const existingVariant = sku
        ? await this.prisma.productVariant.findUnique({ where: { sku } })
        : null;

      if (brandSlug && !brand) {
        errors.push('برند با این slug پیدا نشد');
      }

      if (categorySlug && !category) {
        errors.push('دسته‌بندی با این slug پیدا نشد');
      }

      if (existingProduct) {
        errors.push('محصول با این slug قبلاً وجود دارد');
      }

      if (existingVariant) {
        errors.push('تنوع با این SKU قبلاً وجود دارد');
      }

      preview.push({
        rowNumber,
        valid: errors.length === 0,
        errors,
        data: {
          name,
          englishName,
          slug,
          brandSlug,
          categorySlug,
          shortDesc,
          description,
          variantTitle,
          sku,
          volume,
          barcode,
          price: price ?? 0,
          salePrice,
          stock,
          isActive,
          imageUrl,
          imageAlt,
          imageIsPrimary,
          imageSortOrder,
        },
      });
    }

    return {
      totalRows: preview.length,
      validRows: preview.filter((item) => item.valid).length,
      invalidRows: preview.filter((item) => !item.valid).length,
      rows: preview,
    };
  }

  async confirmImport(rows: any[]) {
    if (!rows || !Array.isArray(rows) || !rows.length) {
      throw new BadRequestException('داده‌ای برای ثبت ارسال نشده است');
    }

    const created: any[] = [];

    for (const item of rows) {
      const data = item.data || item;

      const name = String(data.name || '').trim();
      const englishName = String(data.englishName || '').trim();
      const slug = String(data.slug || '').trim();
      const brandSlug = String(data.brandSlug || '').trim();
      const categorySlug = String(data.categorySlug || '').trim();
      const shortDesc = String(data.shortDesc || '').trim();
      const description = String(data.description || '').trim();
      const variantTitle = String(data.variantTitle || '').trim();
      const sku = String(data.sku || '').trim();
      const volume = this.parseVolume(data.volume);
      const barcode = String(data.barcode || '').trim();
      const price = this.parseNumber(data.price);
      const salePrice = this.parseNumber(data.salePrice);
      const stock = this.parseNumber(data.stock) ?? 0;
      const isActive = this.parseBoolean(data.isActive, true);

      const imageUrl = String(data.imageUrl || '').trim();
      const imageAlt = String(data.imageAlt || '').trim();
      const imageIsPrimary = this.parseBoolean(data.imageIsPrimary, true);
      const imageSortOrder = this.parseNumber(data.imageSortOrder) ?? 0;

      if (!name) throw new BadRequestException('نام محصول وارد نشده است');
      if (!slug) throw new BadRequestException('اسلاگ محصول وارد نشده است');
      if (!brandSlug) throw new BadRequestException('اسلاگ برند وارد نشده است');

      if (!categorySlug) {
        throw new BadRequestException('اسلاگ دسته‌بندی وارد نشده است');
      }

      if (!variantTitle) {
        throw new BadRequestException('عنوان تنوع وارد نشده است');
      }

      if (!sku) throw new BadRequestException('SKU وارد نشده است');

      if (price === null || price <= 0) {
        throw new BadRequestException('قیمت نامعتبر است');
      }

      if (salePrice !== null && salePrice < 0) {
        throw new BadRequestException('قیمت تخفیف نامعتبر است');
      }

      if (stock < 0) {
        throw new BadRequestException('موجودی نامعتبر است');
      }

      if (imageSortOrder < 0) {
        throw new BadRequestException('ترتیب عکس نامعتبر است');
      }

      const brand = await this.prisma.brand.findUnique({
        where: { slug: brandSlug },
      });

      const category = await this.prisma.category.findUnique({
        where: { slug: categorySlug },
      });

      if (!brand) {
        throw new BadRequestException(`برند ${brandSlug} پیدا نشد`);
      }

      if (!category) {
        throw new BadRequestException(`دسته‌بندی ${categorySlug} پیدا نشد`);
      }

      const existingProduct = await this.prisma.product.findUnique({
        where: { slug },
      });

      if (existingProduct) {
        throw new BadRequestException(`محصول با slug ${slug} قبلاً وجود دارد`);
      }

      const existingVariant = await this.prisma.productVariant.findUnique({
        where: { sku },
      });

      if (existingVariant) {
        throw new BadRequestException(`تنوع با SKU ${sku} قبلاً وجود دارد`);
      }

      const product = await this.prisma.$transaction(async (tx) => {
        const createdProduct = await tx.product.create({
          data: {
            name,
            englishName: englishName || null,
            slug,
            shortDesc: shortDesc || null,
            description: description || null,
            isActive,
            brandId: brand.id,
            categoryId: category.id,
            variants: {
              create: {
                title: variantTitle,
                sku,
                volume,
                barcode: barcode || null,
                price,
                salePrice,
                stock,
                isActive,
              },
            },
          },
          include: {
            variants: true,
            brand: true,
            category: true,
          },
        });

        if (imageUrl) {
          await tx.productImage.create({
            data: {
              imageUrl,
              alt: imageAlt || null,
              isPrimary: imageIsPrimary,
              sortOrder: imageSortOrder,
              productId: createdProduct.id,
            },
          });
        }

        const images = await tx.productImage.findMany({
          where: { productId: createdProduct.id },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
        });

        return {
          ...createdProduct,
          images,
        };
      });

      created.push(product);
    }

    return {
      message: 'محصولات با موفقیت ثبت شدند',
      count: created.length,
      products: created,
    };
  }

  async previewUpdate(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('فایل اکسل ارسال نشده است');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
    }) as Record<string, unknown>[];

    if (!rows.length) {
      throw new BadRequestException('فایل اکسل خالی است');
    }

    const preview: UpdatePreviewRow[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;
      const errors: string[] = [];

      const sku = String(row.sku || '').trim();

      if (!sku) {
        errors.push('SKU وارد نشده است');
      }

      const variant = sku
        ? await this.prisma.productVariant.findUnique({
            where: { sku },
            include: {
              product: true,
            },
          })
        : null;

      if (sku && !variant) {
        errors.push('تنوع محصول با این SKU پیدا نشد');
      }

      const price = this.isEmptyCell(row.price)
        ? undefined
        : this.parseNumber(row.price);

      const salePrice = this.isEmptyCell(row.salePrice)
        ? undefined
        : this.parseNumber(row.salePrice);

      const stock = this.isEmptyCell(row.stock)
        ? undefined
        : this.parseNumber(row.stock);

      const volume = this.isEmptyCell(row.volume)
        ? undefined
        : this.parseVolume(row.volume);

      const imageSortOrder = this.isEmptyCell(row.imageSortOrder)
        ? undefined
        : this.parseNumber(row.imageSortOrder);

      if (price !== undefined && (price === null || price <= 0)) {
        errors.push('قیمت نامعتبر است');
      }

      if (salePrice !== undefined && salePrice !== null && salePrice < 0) {
        errors.push('قیمت تخفیف نامعتبر است');
      }

      if (stock !== undefined && (stock === null || stock < 0)) {
        errors.push('موجودی نامعتبر است');
      }

      if (volume !== undefined && volume === null) {
        errors.push('حجم محصول نامعتبر است');
      }

      if (
        imageSortOrder !== undefined &&
        (imageSortOrder === null || imageSortOrder < 0)
      ) {
        errors.push('ترتیب عکس نامعتبر است');
      }

      const data: Record<string, any> = {
        sku,
      };

      if (!this.isEmptyCell(row.name)) {
        data.name = String(row.name).trim();
      }

      if (!this.isEmptyCell(row.englishName)) {
        data.englishName = String(row.englishName).trim();
      }

      if (!this.isEmptyCell(row.shortDesc)) {
        data.shortDesc = String(row.shortDesc).trim();
      }

      if (!this.isEmptyCell(row.description)) {
        data.description = String(row.description).trim();
      }

      if (!this.isEmptyCell(row.variantTitle)) {
        data.variantTitle = String(row.variantTitle).trim();
      }

      if (!this.isEmptyCell(row.barcode)) {
        data.barcode = String(row.barcode).trim();
      }

      if (price !== undefined) data.price = price;
      if (salePrice !== undefined) data.salePrice = salePrice;
      if (stock !== undefined) data.stock = stock;
      if (volume !== undefined) data.volume = volume;

      if (!this.isEmptyCell(row.isActive)) {
        data.isActive = this.parseBoolean(row.isActive, true);
      }

      if (!this.isEmptyCell(row.imageUrl)) {
        data.imageUrl = String(row.imageUrl).trim();
      }

      if (!this.isEmptyCell(row.imageAlt)) {
        data.imageAlt = String(row.imageAlt).trim();
      }

      if (!this.isEmptyCell(row.imageIsPrimary)) {
        data.imageIsPrimary = this.parseBoolean(row.imageIsPrimary, true);
      }

      if (imageSortOrder !== undefined) {
        data.imageSortOrder = imageSortOrder;
      }

      preview.push({
        rowNumber,
        valid: errors.length === 0,
        errors,
        current: variant
          ? {
              productId: variant.productId,
              productName: variant.product.name,
              productSlug: variant.product.slug,
              variantId: variant.id,
              sku: variant.sku,
            }
          : undefined,
        data,
      });
    }

    return {
      totalRows: preview.length,
      validRows: preview.filter((item) => item.valid).length,
      invalidRows: preview.filter((item) => !item.valid).length,
      rows: preview,
    };
  }

  async confirmUpdate(rows: any[]) {
    if (!rows || !Array.isArray(rows) || !rows.length) {
      throw new BadRequestException('داده‌ای برای آپدیت ارسال نشده است');
    }

    const updated: any[] = [];

    for (const item of rows) {
      const data = item.data || item;

      const sku = String(data.sku || '').trim();

      if (!sku) {
        throw new BadRequestException('SKU وارد نشده است');
      }

      const variant = await this.prisma.productVariant.findUnique({
        where: { sku },
        include: {
          product: true,
        },
      });

      if (!variant) {
        throw new BadRequestException(`تنوع محصول با SKU ${sku} پیدا نشد`);
      }

      const productData: Record<string, any> = {};
      const variantData: Record<string, any> = {};
      const imageData: Record<string, any> = {};

      if (!this.isEmptyCell(data.name)) {
        productData.name = String(data.name).trim();
      }

      if (!this.isEmptyCell(data.englishName)) {
        productData.englishName = String(data.englishName).trim();
      }

      if (!this.isEmptyCell(data.shortDesc)) {
        productData.shortDesc = String(data.shortDesc).trim();
      }

      if (!this.isEmptyCell(data.description)) {
        productData.description = String(data.description).trim();
      }

      if (!this.isEmptyCell(data.variantTitle)) {
        variantData.title = String(data.variantTitle).trim();
      }

      if (!this.isEmptyCell(data.barcode)) {
        variantData.barcode = String(data.barcode).trim();
      }

      if (!this.isEmptyCell(data.price)) {
        const price = this.parseNumber(data.price);

        if (price === null || price <= 0) {
          throw new BadRequestException(`قیمت برای SKU ${sku} نامعتبر است`);
        }

        variantData.price = price;
      }

      if (!this.isEmptyCell(data.salePrice)) {
        const salePrice = this.parseNumber(data.salePrice);

        if (salePrice === null || salePrice < 0) {
          throw new BadRequestException(
            `قیمت تخفیف برای SKU ${sku} نامعتبر است`,
          );
        }

        variantData.salePrice = salePrice;
      }

      if (!this.isEmptyCell(data.stock)) {
        const stock = this.parseNumber(data.stock);

        if (stock === null || stock < 0) {
          throw new BadRequestException(`موجودی برای SKU ${sku} نامعتبر است`);
        }

        variantData.stock = stock;
      }

      if (!this.isEmptyCell(data.volume)) {
        const volume = this.parseVolume(data.volume);

        if (volume === null) {
          throw new BadRequestException(`حجم برای SKU ${sku} نامعتبر است`);
        }

        variantData.volume = volume;
      }

      if (!this.isEmptyCell(data.isActive)) {
        const isActive = this.parseBoolean(data.isActive, true);

        productData.isActive = isActive;
        variantData.isActive = isActive;
      }

      if (!this.isEmptyCell(data.imageUrl)) {
        imageData.imageUrl = String(data.imageUrl).trim();
      }

      if (!this.isEmptyCell(data.imageAlt)) {
        imageData.alt = String(data.imageAlt).trim();
      }

      if (!this.isEmptyCell(data.imageIsPrimary)) {
        imageData.isPrimary = this.parseBoolean(data.imageIsPrimary, true);
      }

      if (!this.isEmptyCell(data.imageSortOrder)) {
        const imageSortOrder = this.parseNumber(data.imageSortOrder);

        if (imageSortOrder === null || imageSortOrder < 0) {
          throw new BadRequestException(
            `ترتیب عکس برای SKU ${sku} نامعتبر است`,
          );
        }

        imageData.sortOrder = imageSortOrder;
      }

      if (
        !Object.keys(productData).length &&
        !Object.keys(variantData).length &&
        !Object.keys(imageData).length
      ) {
        throw new BadRequestException(
          `هیچ داده‌ای برای آپدیت SKU ${sku} ارسال نشده است`,
        );
      }

      const result = await this.prisma.$transaction(async (tx) => {
        if (Object.keys(productData).length) {
          await tx.product.update({
            where: { id: variant.productId },
            data: productData,
          });
        }

        if (Object.keys(variantData).length) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: variantData,
          });
        }

        if (Object.keys(imageData).length) {
          const existingImage = await tx.productImage.findFirst({
            where: { productId: variant.productId },
            orderBy: [
              { isPrimary: 'desc' },
              { sortOrder: 'asc' },
              { id: 'asc' },
            ],
          });

          if (existingImage) {
            await tx.productImage.update({
              where: { id: existingImage.id },
              data: imageData,
            });
          } else {
            if (!imageData.imageUrl) {
              throw new BadRequestException(
                `برای ساخت عکس محصول، imageUrl برای SKU ${sku} لازم است`,
              );
            }

            await tx.productImage.create({
              data: {
                imageUrl: imageData.imageUrl,
                alt: imageData.alt || null,
                isPrimary: imageData.isPrimary ?? true,
                sortOrder: imageData.sortOrder ?? 0,
                productId: variant.productId,
              },
            });
          }
        }

        const product = await tx.product.findUnique({
          where: { id: variant.productId },
          include: {
            variants: true,
            brand: true,
            category: true,
          },
        });

        if (!product) {
          throw new BadRequestException(`محصول مربوط به SKU ${sku} پیدا نشد`);
        }

        const images = await tx.productImage.findMany({
          where: { productId: variant.productId },
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],
        });

        return {
          ...product,
          images,
        };
      });

      updated.push(result);
    }

    return {
      message: 'محصولات با موفقیت آپدیت شدند',
      count: updated.length,
      products: updated,
    };
  }

  async exportProducts() {
    const products = await this.prisma.product.findMany({
      include: {
        brand: true,
        category: true,
        variants: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    const rows: any[] = [];

    for (const product of products) {
      const primaryImage = await this.prisma.productImage.findFirst({
        where: { productId: product.id },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      });

      for (const variant of product.variants) {
        rows.push({
          name: product.name,
          englishName: product.englishName || '',
          slug: product.slug,
          brandSlug: product.brand?.slug || '',
          categorySlug: product.category?.slug || '',
          shortDesc: product.shortDesc || '',
          description: product.description || '',
          variantTitle: variant.title,
          sku: variant.sku,
          volume: variant.volume ?? '',
          barcode: variant.barcode || '',
          price: Number(variant.price),
          salePrice: variant.salePrice ? Number(variant.salePrice) : '',
          stock: variant.stock,
          isActive: product.isActive,
          imageUrl: primaryImage?.imageUrl || '',
          imageAlt: primaryImage?.alt || '',
          imageIsPrimary: primaryImage?.isPrimary ?? '',
          imageSortOrder: primaryImage?.sortOrder ?? '',
        });
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'products');

    return XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });
  }

  async downloadTemplate() {
    const rows = [
      {
        name: 'کرم آبرسان لورآل',
        englishName: 'Loreal Hydrating Cream',
        slug: 'loreal-hydrating-cream-test',
        brandSlug: 'dior',
        categorySlug: 'skin-care',
        shortDesc: 'توضیح کوتاه محصول',
        description: 'توضیحات کامل محصول',
        variantTitle: 'حجم ۵۰ میل',
        sku: 'LOR-HYD-50-TEST',
        volume: 50,
        barcode: '123456789',
        price: 850000,
        salePrice: 790000,
        stock: 10,
        isActive: true,
        imageUrl: '/uploads/products/loreal-hydrating-cream.jpg',
        imageAlt: 'کرم آبرسان لورآل',
        imageIsPrimary: true,
        imageSortOrder: 0,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'template');

    return XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });
  }

  async downloadUpdateTemplate() {
    const rows = [
      {
        sku: 'DS100',
        name: '',
        englishName: '',
        shortDesc: '',
        description: '',
        variantTitle: '',
        volume: '',
        barcode: '',
        price: 6000000,
        salePrice: 5700000,
        stock: 20,
        isActive: true,
        imageUrl: '/uploads/products/dior-sauvage.jpg',
        imageAlt: 'Dior Sauvage',
        imageIsPrimary: true,
        imageSortOrder: 0,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'update-template');

    return XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });
  }
}