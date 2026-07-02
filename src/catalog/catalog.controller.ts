import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('home')
  async getHome() {
    return this.catalogService.getHome();
  }

  @Get('filters')
  async getFilters() {
    return this.catalogService.getFilters();
  }

  @Get('search/suggestions')
  async getSearchSuggestions(@Query('q') q?: string) {
    return this.catalogService.getSearchSuggestions(q);
  }

  @Get('products')
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('brand') brand?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
    @Query('hasDiscount') hasDiscount?: string,
    @Query('sort') sort?: string,
  ) {
    return this.catalogService.getProducts({
      page,
      limit,
      search,
      brand,
      category,
      minPrice,
      maxPrice,
      inStock,
      hasDiscount,
      sort,
    });
  }

  @Get('products/:slug')
  async getProductBySlug(@Param('slug') slug: string) {
    return this.catalogService.getProductBySlug(slug);
  }
}