import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { RecommendationsService } from './recommendations.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getRecommendationsForMe(
    @Req() request: any,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationsService.getRecommendationsForMe(
      request.user.id,
      query,
    );
  }

  @Get('similar/:productId')
  getSimilarProducts(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.getSimilarProducts(
      productId,
      limit ? Number(limit) : 8,
    );
  }
}