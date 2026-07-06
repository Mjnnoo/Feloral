import {
  Controller,
  Get,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

import { PostexService } from './postex.service';

@Controller('shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class PostexHealthController {
  constructor(private readonly postexService: PostexService) {}

  @Get('postex/health')
  async getPostexHealth() {
    const config = this.postexService.getConfigStatus();

    const checks = {
      apiKey: config.hasApiKey,
      fromCityId: Boolean(config.fromCityId),
      wallet: false,
    };

    let wallet: {
      amountIrr: number;
      amountToman: number;
      frozenAmountIrr: number;
      frozenAmountToman: number;
      userId: string | null;
    } | null = null;

    let walletError: unknown = null;

    if (checks.apiKey) {
      try {
        const walletResponse = await this.postexService.getWalletBalance();

        const amountIrr = Number(walletResponse?.amount ?? 0);
        const frozenAmountIrr = Number(walletResponse?.frozenAmount ?? 0);

        wallet = {
          amountIrr,
          amountToman: Math.floor(amountIrr / 10),
          frozenAmountIrr,
          frozenAmountToman: Math.floor(frozenAmountIrr / 10),
          userId: walletResponse?.userId || walletResponse?.userID || null,
        };

        checks.wallet = true;
      } catch (error) {
        walletError = this.formatError(error);
      }
    }

    const ready =
      checks.apiKey &&
      checks.fromCityId &&
      checks.wallet &&
      Number(wallet?.amountIrr ?? 0) > 0;

    return {
      ready,
      connected: checks.wallet,
      message: this.getHealthMessage({
        hasApiKey: checks.apiKey,
        hasFromCityId: checks.fromCityId,
        hasWalletConnection: checks.wallet,
        walletAmountIrr: wallet?.amountIrr ?? 0,
      }),
      config: {
        baseUrl: config.baseUrl,
        hasApiKey: config.hasApiKey,
        authHeaderName: config.authHeaderName,
        fromCityId: config.fromCityId,
      },
      wallet,
      checks,
      error: walletError,
    };
  }

  private getHealthMessage(input: {
    hasApiKey: boolean;
    hasFromCityId: boolean;
    hasWalletConnection: boolean;
    walletAmountIrr: number;
  }) {
    if (!input.hasApiKey) {
      return 'POSTEX_API_KEY داخل فایل .env تنظیم نشده است';
    }

    if (!input.hasFromCityId) {
      return 'POSTEX_FROM_CITY_ID داخل فایل .env تنظیم نشده است';
    }

    if (!input.hasWalletConnection) {
      return 'اتصال به کیف پول پستکس برقرار نشد';
    }

    if (input.walletAmountIrr <= 0) {
      return 'اتصال پستکس برقرار است اما کیف پول شارژ ندارد';
    }

    return 'پستکس آماده ثبت مرسوله است';
  }

  private formatError(error: unknown) {
    if (error instanceof InternalServerErrorException) {
      return error.getResponse();
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'getResponse' in error &&
      typeof (error as { getResponse?: unknown }).getResponse === 'function'
    ) {
      return (error as { getResponse: () => unknown }).getResponse();
    }

    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    return error;
  }
}
