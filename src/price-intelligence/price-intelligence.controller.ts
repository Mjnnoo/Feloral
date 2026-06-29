import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { PriceIntelligenceService } from './price-intelligence.service';
import { PriceCrawlerService } from './price-crawler.service';

import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';
import { CreateCompetitorLinkDto } from './dto/create-competitor-link.dto';
import { UpdateCompetitorLinkDto } from './dto/update-competitor-link.dto';
import { CreatePriceSnapshotDto } from './dto/create-price-snapshot.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('price-intelligence')
export class PriceIntelligenceController {
  constructor(
    private readonly priceIntelligenceService: PriceIntelligenceService,
    private readonly priceCrawlerService: PriceCrawlerService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Post('competitors')
  createCompetitor(@Body() dto: CreateCompetitorDto) {
    return this.priceIntelligenceService.createCompetitor(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('competitors')
  getCompetitors() {
    return this.priceIntelligenceService.getCompetitors();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('competitors/:id')
  getCompetitorById(@Param('id', ParseIntPipe) id: number) {
    return this.priceIntelligenceService.getCompetitorById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Patch('competitors/:id')
  updateCompetitor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompetitorDto,
  ) {
    return this.priceIntelligenceService.updateCompetitor(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Delete('competitors/:id')
  deleteCompetitor(@Param('id', ParseIntPipe) id: number) {
    return this.priceIntelligenceService.deleteCompetitor(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Post('links')
  createCompetitorLink(@Body() dto: CreateCompetitorLinkDto) {
    return this.priceIntelligenceService.createCompetitorLink(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('products/:productId/links')
  getLinksByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.priceIntelligenceService.getLinksByProduct(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('links/:id')
  getCompetitorLinkById(@Param('id', ParseIntPipe) id: number) {
    return this.priceIntelligenceService.getCompetitorLinkById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Patch('links/:id')
  updateCompetitorLink(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompetitorLinkDto,
  ) {
    return this.priceIntelligenceService.updateCompetitorLink(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Delete('links/:id')
  deleteCompetitorLink(@Param('id', ParseIntPipe) id: number) {
    return this.priceIntelligenceService.deleteCompetitorLink(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Post('snapshots')
  createPriceSnapshot(@Body() dto: CreatePriceSnapshotDto) {
    return this.priceIntelligenceService.createPriceSnapshot(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('products/:productId/snapshots')
  getSnapshotsByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.priceIntelligenceService.getSnapshotsByProduct(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Post('products/:productId/analyze')
  analyzeProductPrice(@Param('productId', ParseIntPipe) productId: number) {
    return this.priceIntelligenceService.analyzeProductPrice(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('products/:productId/insight')
  getInsightByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.priceIntelligenceService.getInsightByProduct(productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI, Role.SUPPORT)
  @Get('admin/insights')
  getAllInsightsForAdmin() {
    return this.priceIntelligenceService.getAllInsightsForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Post('crawl/run')
  runCrawlerManually() {
    return this.priceCrawlerService.crawlAllActiveLinks();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Post('crawl/links/:id')
  crawlSingleLink(@Param('id', ParseIntPipe) id: number) {
    return this.priceCrawlerService.crawlSingleLinkForAdmin(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AI)
  @Post('crawl/links/:id/debug')
  debugCrawlerLink(@Param('id', ParseIntPipe) id: number) {
    return this.priceCrawlerService.debugCrawlerLink(id);
  }
}