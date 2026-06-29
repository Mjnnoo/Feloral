import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { AiAdvisorService } from './ai-advisor.service';
import { AskAiAdvisorDto } from './dto/ask-ai-advisor.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai-advisor')
export class AiAdvisorController {
  constructor(private readonly aiAdvisorService: AiAdvisorService) {}

  @UseGuards(JwtAuthGuard)
  @Post('ask')
  ask(@Req() request: any, @Body() dto: AskAiAdvisorDto) {
    return this.aiAdvisorService.ask(request.user.id, dto);
  }
}