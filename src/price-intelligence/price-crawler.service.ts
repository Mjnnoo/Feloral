import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { chromium, type Page } from 'playwright';

import { PriceSnapshotSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PriceIntelligenceService } from './price-intelligence.service';

type PriceDetectionResult = {
  price: number;
  text: string;
  source: string;
  selector?: string | null;
};

type PagePriceCandidate = {
  text: string;
  source: string;
  selector?: string | null;
};

@Injectable()
export class PriceCrawlerService {
  private readonly logger = new Logger(PriceCrawlerService.name);

  private readonly edgeExecutablePath =
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

  constructor(
    private readonly prisma: PrismaService,
    private readonly priceIntelligenceService: PriceIntelligenceService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async runScheduledCrawler() {
    if (process.env.PRICE_CRAWLER_ENABLED !== 'true') {
      return;
    }

    this.logger.log('Scheduled price crawler started');

    try {
      const result = await this.crawlAllActiveLinks();

      this.logger.log(
        `Scheduled price crawler finished. Success: ${result.successCount}, Failed: ${result.failedCount}`,
      );
    } catch (error) {
      this.logger.error(
        'Scheduled price crawler failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async crawlAllActiveLinks() {
    const links = await this.prisma.competitorProductLink.findMany({
      where: {
        isActive: true,
        competitor: {
          isActive: true,
        },
      },
      include: {
        competitor: true,
        product: {
          select: {
            id: true,
            name: true,
            englishName: true,
            slug: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    const results: any[] = [];

    for (const link of links) {
      try {
        const result = await this.crawlLink(link.id);

        results.push({
          linkId: link.id,
          productId: link.productId,
          competitor: link.competitor.name,
          success: true,
          result,
        });
      } catch (error: any) {
        results.push({
          linkId: link.id,
          productId: link.productId,
          competitor: link.competitor.name,
          success: false,
          error: error?.message ?? 'Unknown crawler error',
        });
      }
    }

    const successCount = results.filter((item) => item.success).length;
    const failedCount = results.length - successCount;

    return {
      totalLinks: links.length,
      successCount,
      failedCount,
      results,
    };
  }

  async crawlSingleLinkForAdmin(linkId: number) {
    const result = await this.crawlLink(linkId);

    return {
      success: true,
      linkId,
      result,
    };
  }

  async debugCrawlerLink(linkId: number) {
    const link = await this.prisma.competitorProductLink.findUnique({
      where: {
        id: linkId,
      },
      include: {
        competitor: true,
        product: {
          select: {
            id: true,
            name: true,
            englishName: true,
            slug: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Competitor product link not found');
    }

    if (!existsSync(this.edgeExecutablePath)) {
      throw new BadRequestException(
        [
          'Microsoft Edge executable was not found.',
          `Expected path: ${this.edgeExecutablePath}`,
        ].join(' '),
      );
    }

    const browser = await chromium.launch({
      executablePath: this.edgeExecutablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    try {
      const page = await browser.newPage({
        locale: 'fa-IR',
        viewport: {
          width: 1366,
          height: 768,
        },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      });

      let gotoError: string | null = null;

      try {
        await page.goto(link.url, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
      } catch (error: any) {
        gotoError = error?.message ?? 'Unknown page.goto error';
      }

      try {
        await page.waitForLoadState('networkidle', {
          timeout: 10000,
        });
      } catch {
        // Ignore network idle timeout.
      }

      await page.waitForTimeout(5000);

      const pageTitle = await page.title();
      const finalUrl = page.url();

      const bodyText = await page
        .locator('body')
        .innerText({
          timeout: 5000,
        })
        .catch(() => '');

      const html = await page.content();

      const candidates = await this.extractPriceCandidatesWithPlaywright(page);

      const debugDir = join(process.cwd(), 'uploads', 'debug-crawler');

      mkdirSync(debugDir, {
        recursive: true,
      });

      const fileName = `debug-link-${link.id}-${Date.now()}.png`;
      const screenshotPath = join(debugDir, fileName);

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      const normalizedBodyText = this.normalizeDigits(bodyText);

      return {
        success: true,
        link: {
          id: link.id,
          url: link.url,
          product: link.product,
          competitor: {
            id: link.competitor.id,
            name: link.competitor.name,
            slug: link.competitor.slug,
          },
        },
        page: {
          title: pageTitle,
          finalUrl,
          gotoError,
          htmlLength: html.length,
        },
        screenshot: {
          path: screenshotPath,
          relativePath: `uploads/debug-crawler/${fileName}`,
          url: `/uploads/debug-crawler/${fileName}`,
        },
        indicators: {
          hasToman: bodyText.includes('تومان'),
          hasRial: bodyText.includes('ریال'),
          hasPriceWord: bodyText.includes('قیمت'),
          hasUnavailableWord:
            bodyText.includes('ناموجود') ||
            bodyText.includes('اتمام موجودی') ||
            bodyText.includes('تمام شد'),
          digitCount: (normalizedBodyText.match(/[0-9]/g) ?? []).length,
          candidateCount: candidates.length,
        },
        textSample: bodyText.slice(0, 4000),
        priceCandidates: candidates.slice(0, 50),
        browserExecutablePath: this.edgeExecutablePath,
      };
    } finally {
      await browser.close();
    }
  }

  private async crawlLink(linkId: number) {
    const link = await this.prisma.competitorProductLink.findUnique({
      where: {
        id: linkId,
      },
      include: {
        competitor: true,
        product: {
          select: {
            id: true,
            name: true,
            englishName: true,
            slug: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Competitor product link not found');
    }

    if (!link.isActive) {
      throw new BadRequestException('Competitor product link is inactive');
    }

    if (!link.competitor.isActive) {
      throw new BadRequestException('Competitor is inactive');
    }

    const isDigikala =
      link.competitor.slug.toLowerCase() === 'digikala' ||
      link.url.includes('digikala.com');

    if (isDigikala) {
      return this.crawlDigikalaLink(link);
    }

    return this.crawlHtmlLink(link);
  }

  private async crawlDigikalaLink(link: any) {
    let apiFailureMessage: string | null = null;

    try {
      return await this.crawlDigikalaApiLink(link);
    } catch (error: any) {
      apiFailureMessage = error?.message ?? 'Unknown Digikala API error';

      this.logger.warn(
        `Digikala API failed. Falling back to Playwright. LinkId: ${link.id}. Error: ${apiFailureMessage}`,
      );
    }

    return this.crawlPlaywrightLink(
      link,
      'digikala_playwright_fallback',
      apiFailureMessage,
    );
  }

  private async crawlDigikalaApiLink(link: any) {
    const dkp = this.extractDigikalaProductId(link.url);

    if (!dkp) {
      throw new BadRequestException(
        'Digikala product id not found in URL. URL should contain something like dkp-7608527.',
      );
    }

    const apiUrl = `https://api.digikala.com/v1/product/${dkp}/`;

    let response: any;

    try {
      response = await axios.get(apiUrl, {
        timeout: 15000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 FeloralPriceBot/1.0',
          Accept: 'application/json,text/plain,*/*',
          'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const statusText = error?.response?.statusText;
      const message = error?.message ?? 'Unknown axios error';

      throw new BadRequestException(
        [
          'Digikala API request failed.',
          `DKP: ${dkp}`,
          `API: ${apiUrl}`,
          `Status: ${status ?? 'unknown'}`,
          `StatusText: ${statusText ?? 'unknown'}`,
          `Message: ${message}`,
        ].join(' '),
      );
    }

    const productData = response.data?.data?.product ?? response.data;

    const title =
      productData?.title_fa ??
      productData?.title_en ??
      productData?.title ??
      null;

    const detected = this.detectPriceFromDigikalaJson(productData);

    if (!detected) {
      throw new BadRequestException(
        [
          'Digikala API response received but price was not found.',
          `DKP: ${dkp}`,
          `API: ${apiUrl}`,
          'The product may be unavailable, blocked, or the response structure may have changed.',
        ].join(' '),
      );
    }

    const snapshot = await this.prisma.priceSnapshot.create({
      data: {
        competitorProductLinkId: link.id,
        price: detected.price,
        salePrice: detected.salePrice,
        currency: 'IRR',
        isAvailable: detected.isAvailable,
        source: PriceSnapshotSource.api,
      },
      include: {
        competitorProductLink: {
          include: {
            competitor: true,
            product: {
              select: {
                id: true,
                name: true,
                englishName: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const analysis =
      await this.priceIntelligenceService.analyzeProductPrice(link.productId);

    return {
      product: link.product,
      competitor: {
        id: link.competitor.id,
        name: link.competitor.name,
        slug: link.competitor.slug,
      },
      crawled: {
        mode: 'digikala_api',
        url: link.url,
        apiUrl,
        dkp,
        pageTitle: title,
        priceText: detected.priceText,
        price: detected.price,
        salePrice: detected.salePrice,
        isAvailable: detected.isAvailable,
      },
      snapshot,
      analysis,
    };
  }

  private async crawlPlaywrightLink(
    link: any,
    mode = 'playwright',
    fallbackReason?: string | null,
  ) {
    if (!existsSync(this.edgeExecutablePath)) {
      throw new BadRequestException(
        [
          'Microsoft Edge executable was not found.',
          `Expected path: ${this.edgeExecutablePath}`,
          'Install Microsoft Edge or update edgeExecutablePath in price-crawler.service.ts.',
        ].join(' '),
      );
    }

    const browser = await chromium.launch({
      executablePath: this.edgeExecutablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    try {
      const page = await browser.newPage({
        locale: 'fa-IR',
        viewport: {
          width: 1366,
          height: 768,
        },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      });

      await page.goto(link.url, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });

      try {
        await page.waitForLoadState('networkidle', {
          timeout: 10000,
        });
      } catch {
        // Ignore network idle timeout.
      }

      await page.waitForTimeout(5000);

      const pageTitle = await page.title();
      const html = await page.content();
      const $ = cheerio.load(html);

      const multiplier = link.competitor.priceMultiplier ?? 1;

      let priceDetection = this.detectPrice(
        $,
        link.competitor.priceSelector,
        multiplier,
      );

      if (!priceDetection) {
        const candidates = await this.extractPriceCandidatesWithPlaywright(page);

        priceDetection = this.detectBestPriceFromTextCandidates(
          candidates,
          multiplier,
        );
      }

      if (!priceDetection) {
        throw new BadRequestException(
          [
            'Playwright opened the page but price was not found.',
            `URL: ${link.url}`,
            `Page title: ${pageTitle || 'unknown'}`,
            `Configured selector: ${link.competitor.priceSelector ?? 'not set'}`,
            `Fallback reason: ${fallbackReason ?? 'none'}`,
            'The page may be protected, product may be unavailable, or price selector needs manual configuration.',
          ].join(' '),
        );
      }

      let salePrice: number | null = null;
      let salePriceText: string | null = null;
      let salePriceSource: string | null = null;

      if (link.competitor.salePriceSelector) {
        const saleDetection = this.detectPrice(
          $,
          link.competitor.salePriceSelector,
          multiplier,
        );

        if (saleDetection) {
          salePrice = saleDetection.price;
          salePriceText = saleDetection.text;
          salePriceSource = saleDetection.source;
        }
      }

      const isAvailable = this.detectAvailability(
        $,
        link.competitor.availabilitySelector,
      );

      const snapshot = await this.prisma.priceSnapshot.create({
        data: {
          competitorProductLinkId: link.id,
          price: priceDetection.price,
          salePrice,
          currency: 'IRR',
          isAvailable,
          source: PriceSnapshotSource.crawler,
        },
        include: {
          competitorProductLink: {
            include: {
              competitor: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  englishName: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      const analysis =
        await this.priceIntelligenceService.analyzeProductPrice(link.productId);

      return {
        product: link.product,
        competitor: {
          id: link.competitor.id,
          name: link.competitor.name,
          slug: link.competitor.slug,
        },
        crawled: {
          mode,
          url: link.url,
          pageTitle,
          priceText: priceDetection.text,
          price: priceDetection.price,
          priceSource: priceDetection.source,
          priceSelector: priceDetection.selector ?? null,
          salePriceText,
          salePrice,
          salePriceSource,
          isAvailable,
          fallbackReason,
          browserExecutablePath: this.edgeExecutablePath,
        },
        snapshot,
        analysis,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        [
          'Playwright crawler failed.',
          `URL: ${link.url}`,
          `Message: ${error?.message ?? 'Unknown Playwright error'}`,
          `Fallback reason: ${fallbackReason ?? 'none'}`,
        ].join(' '),
      );
    } finally {
      await browser.close();
    }
  }

  private async crawlHtmlLink(link: any) {
    const html = await this.fetchHtml(link.url);
    const $ = cheerio.load(html);

    const multiplier = link.competitor.priceMultiplier ?? 1;

    const priceDetection = this.detectPrice(
      $,
      link.competitor.priceSelector,
      multiplier,
    );

    if (!priceDetection) {
      const pageTitle = $('title').first().text().trim();

      throw new BadRequestException(
        [
          'Price not found.',
          `URL: ${link.url}`,
          `Page title: ${pageTitle || 'unknown'}`,
          `Configured selector: ${link.competitor.priceSelector ?? 'not set'}`,
          'Crawler tried: configured selector, JSON-LD, meta tags, itemprop price, and common price selectors.',
          'Use a real product URL and inspect the page HTML to find the correct selector.',
        ].join(' '),
      );
    }

    let salePrice: number | null = null;
    let salePriceText: string | null = null;
    let salePriceSource: string | null = null;

    if (link.competitor.salePriceSelector) {
      const saleDetection = this.detectPrice(
        $,
        link.competitor.salePriceSelector,
        multiplier,
      );

      if (saleDetection) {
        salePrice = saleDetection.price;
        salePriceText = saleDetection.text;
        salePriceSource = saleDetection.source;
      }
    }

    const pageTitle = link.competitor.titleSelector
      ? $(link.competitor.titleSelector).first().text().trim()
      : $('title').first().text().trim();

    const isAvailable = this.detectAvailability(
      $,
      link.competitor.availabilitySelector,
    );

    const snapshot = await this.prisma.priceSnapshot.create({
      data: {
        competitorProductLinkId: link.id,
        price: priceDetection.price,
        salePrice,
        currency: 'IRR',
        isAvailable,
        source: PriceSnapshotSource.crawler,
      },
      include: {
        competitorProductLink: {
          include: {
            competitor: true,
            product: {
              select: {
                id: true,
                name: true,
                englishName: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const analysis =
      await this.priceIntelligenceService.analyzeProductPrice(link.productId);

    return {
      product: link.product,
      competitor: {
        id: link.competitor.id,
        name: link.competitor.name,
        slug: link.competitor.slug,
      },
      crawled: {
        mode: 'html_crawler',
        url: link.url,
        pageTitle,
        priceText: priceDetection.text,
        price: priceDetection.price,
        priceSource: priceDetection.source,
        priceSelector: priceDetection.selector ?? null,
        salePriceText,
        salePrice,
        salePriceSource,
        isAvailable,
      },
      snapshot,
      analysis,
    };
  }

  private extractDigikalaProductId(url: string) {
    const match = url.match(/dkp-(\d+)/i);

    if (match?.[1]) {
      return match[1];
    }

    const fallbackMatch = url.match(/\/product\/(\d+)/i);

    if (fallbackMatch?.[1]) {
      return fallbackMatch[1];
    }

    return null;
  }

  private detectPriceFromDigikalaJson(productData: any) {
    const priceObjects: any[] = [];

    this.collectDigikalaPriceObjects(productData, priceObjects);

    for (const item of priceObjects) {
      const sellingPrice =
        item.selling_price ??
        item.sellingPrice ??
        item.final_price ??
        item.finalPrice ??
        item.price;

      const rrpPrice =
        item.rrp_price ??
        item.rrpPrice ??
        item.market_price ??
        item.marketPrice ??
        item.base_price ??
        item.basePrice ??
        null;

      const sellingPriceNumber = Number(sellingPrice);
      const rrpPriceNumber = rrpPrice ? Number(rrpPrice) : null;

      if (Number.isNaN(sellingPriceNumber) || sellingPriceNumber <= 0) {
        continue;
      }

      const isAvailable =
        item.is_available ??
        item.isAvailable ??
        (typeof item.status === 'string'
          ? item.status === 'marketable'
          : true);

      if (
        rrpPriceNumber &&
        !Number.isNaN(rrpPriceNumber) &&
        rrpPriceNumber > sellingPriceNumber
      ) {
        return {
          price: rrpPriceNumber,
          salePrice: sellingPriceNumber,
          priceText: String(sellingPrice),
          isAvailable: Boolean(isAvailable),
        };
      }

      return {
        price: sellingPriceNumber,
        salePrice: null,
        priceText: String(sellingPrice),
        isAvailable: Boolean(isAvailable),
      };
    }

    return null;
  }

  private collectDigikalaPriceObjects(value: any, result: any[]) {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        this.collectDigikalaPriceObjects(item, result);
      }

      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    const hasPriceLikeField =
      value.selling_price !== undefined ||
      value.sellingPrice !== undefined ||
      value.rrp_price !== undefined ||
      value.rrpPrice !== undefined ||
      value.price !== undefined ||
      value.final_price !== undefined ||
      value.finalPrice !== undefined ||
      value.market_price !== undefined ||
      value.marketPrice !== undefined ||
      value.base_price !== undefined ||
      value.basePrice !== undefined;

    if (hasPriceLikeField) {
      result.push(value);
    }

    for (const item of Object.values(value)) {
      this.collectDigikalaPriceObjects(item, result);
    }
  }

  private async fetchHtml(url: string) {
    let response: any;

    try {
      response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 FeloralPriceBot/1.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const statusText = error?.response?.statusText;
      const message = error?.message ?? 'Unknown axios error';

      throw new BadRequestException(
        [
          'HTML crawler request failed.',
          `URL: ${url}`,
          `Status: ${status ?? 'unknown'}`,
          `StatusText: ${statusText ?? 'unknown'}`,
          `Message: ${message}`,
        ].join(' '),
      );
    }

    return response.data;
  }

  private detectPrice(
    $: cheerio.CheerioAPI,
    configuredSelector: string | null | undefined,
    multiplier: number,
  ): PriceDetectionResult | null {
    const candidates: {
      text: string;
      source: string;
      selector?: string | null;
    }[] = [];

    const addCandidateFromSelector = (selector: string, source: string) => {
      const element = $(selector).first();

      if (!element.length) {
        return;
      }

      const text = (
        element.attr('content') ??
        element.attr('value') ??
        element.text()
      )
        .trim()
        .replace(/\s+/g, ' ');

      if (text) {
        candidates.push({
          text,
          source,
          selector,
        });
      }
    };

    if (configuredSelector?.trim()) {
      addCandidateFromSelector(
        configuredSelector.trim(),
        'configured_selector',
      );
    }

    const metaSelectors = [
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
      'meta[name="price"]',
      'meta[itemprop="price"]',
      'meta[property="product:sale_price:amount"]',
    ];

    for (const selector of metaSelectors) {
      addCandidateFromSelector(selector, 'meta_tag');
    }

    const jsonLdPrices = this.extractPricesFromJsonLd($);

    for (const priceText of jsonLdPrices) {
      candidates.push({
        text: priceText,
        source: 'json_ld',
        selector: 'script[type="application/ld+json"]',
      });
    }

    const commonSelectors = [
      '[itemprop="price"]',
      '[data-testid*="price"]',
      '[data-test*="price"]',
      '[class*="price"]',
      '[class*="Price"]',
      '.price',
      '.product-price',
      '.final-price',
      '.discounted-price',
      '.sale-price',
      '.current-price',
      '.amount',
    ];

    for (const selector of commonSelectors) {
      addCandidateFromSelector(selector, 'common_selector');
    }

    for (const candidate of candidates) {
      const price = this.parsePrice(candidate.text, multiplier);

      if (price && price >= 10000) {
        return {
          price,
          text: candidate.text,
          source: candidate.source,
          selector: candidate.selector ?? null,
        };
      }
    }

    return null;
  }

  private async extractPriceCandidatesWithPlaywright(page: Page) {
    const candidates = await page.evaluate(() => {
      const result: PagePriceCandidate[] = [];

      const selectors = [
        '[data-testid="price-final"]',
        '[data-testid="price-no-discount"]',
        '[data-testid*="price"]',
        '[data-test*="price"]',
        '[class*="price"]',
        '[class*="Price"]',
        '[itemprop="price"]',
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]',
        'meta[name="price"]',
        'span',
        'div',
      ];

      const addCandidate = (
        text: string | null | undefined,
        source: string,
        selector: string,
      ) => {
        if (!text) {
          return;
        }

        const cleanText = text.trim().replace(/\s+/g, ' ');

        if (!cleanText) {
          return;
        }

        if (cleanText.length > 160) {
          return;
        }

        const hasPersianCurrency =
          cleanText.includes('تومان') ||
          cleanText.includes('ریال') ||
          cleanText.includes('قیمت');

        const hasEnoughDigits =
          (cleanText.match(/[0-9۰-۹٠-٩]/g) ?? []).length >= 5;

        if (!hasPersianCurrency && !hasEnoughDigits) {
          return;
        }

        result.push({
          text: cleanText,
          source,
          selector,
        });
      };

      for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));

        for (const element of elements) {
          if (result.length >= 300) {
            break;
          }

          const htmlElement = element as HTMLElement;

          addCandidate(
            element.getAttribute('content'),
            'playwright_attribute_content',
            selector,
          );

          addCandidate(
            element.getAttribute('value'),
            'playwright_attribute_value',
            selector,
          );

          addCandidate(
            element.getAttribute('aria-label'),
            'playwright_attribute_aria_label',
            selector,
          );

          addCandidate(
            htmlElement.innerText,
            'playwright_inner_text',
            selector,
          );

          addCandidate(
            element.textContent,
            'playwright_text_content',
            selector,
          );
        }
      }

      return result;
    });

    return candidates;
  }

  private detectBestPriceFromTextCandidates(
    candidates: PagePriceCandidate[],
    multiplier: number,
  ): PriceDetectionResult | null {
    for (const candidate of candidates) {
      const price = this.parsePrice(candidate.text, multiplier);

      if (price && price >= 10000) {
        return {
          price,
          text: candidate.text,
          source: candidate.source,
          selector: candidate.selector ?? null,
        };
      }
    }

    return null;
  }

  private extractPricesFromJsonLd($: cheerio.CheerioAPI) {
    const prices: string[] = [];

    $('script[type="application/ld+json"]').each((_, element) => {
      const raw = $(element).text().trim();

      if (!raw) {
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        this.collectPriceValues(parsed, prices);
      } catch {
        return;
      }
    });

    return prices;
  }

  private collectPriceValues(value: any, prices: string[]) {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        this.collectPriceValues(item, prices);
      }

      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    if (value.price !== undefined && value.price !== null) {
      prices.push(String(value.price));
    }

    if (value.lowPrice !== undefined && value.lowPrice !== null) {
      prices.push(String(value.lowPrice));
    }

    if (value.highPrice !== undefined && value.highPrice !== null) {
      prices.push(String(value.highPrice));
    }

    if (value.offers) {
      this.collectPriceValues(value.offers, prices);
    }

    for (const item of Object.values(value)) {
      this.collectPriceValues(item, prices);
    }
  }

  private parsePrice(text: string, multiplier: number) {
    const normalized = this.normalizeDigits(text);

    const cleaned = normalized
      .replace(/,/g, '')
      .replace(/٬/g, '')
      .replace(/٫/g, '')
      .replace(/\./g, '');

    const numbers = cleaned.match(/\d+/g);

    if (!numbers?.length) {
      return null;
    }

    const rawNumber = Number(numbers.join(''));

    if (Number.isNaN(rawNumber)) {
      return null;
    }

    return Math.round(rawNumber * multiplier);
  }

  private normalizeDigits(value: string) {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

    return value
      .split('')
      .map((char) => {
        const persianIndex = persianDigits.indexOf(char);

        if (persianIndex >= 0) {
          return String(persianIndex);
        }

        const arabicIndex = arabicDigits.indexOf(char);

        if (arabicIndex >= 0) {
          return String(arabicIndex);
        }

        return char;
      })
      .join('');
  }

  private detectAvailability(
    $: cheerio.CheerioAPI,
    availabilitySelector?: string | null,
  ) {
    if (!availabilitySelector) {
      return true;
    }

    const text = $(availabilitySelector).first().text().trim().toLowerCase();

    if (!text) {
      return true;
    }

    const unavailableWords = [
      'ناموجود',
      'اتمام موجودی',
      'تمام شد',
      'out of stock',
      'unavailable',
      'not available',
    ];

    return !unavailableWords.some((word) => text.includes(word));
  }
}