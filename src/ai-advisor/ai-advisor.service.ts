import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RecommendationsService } from '../recommendations/recommendations.service';

import { AskAiAdvisorDto } from './dto/ask-ai-advisor.dto';

@Injectable()
export class AiAdvisorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  async ask(userId: number, dto: AskAiAdvisorDto) {
    const profile = await this.prisma.beautyProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        'Beauty profile not found. Please create your beauty profile first.',
      );
    }

    const detectedGoal = this.detectGoal(dto, profile);

    const recommendationResult =
      await this.recommendationsService.getRecommendationsForMe(
        userId,
        {
          limit: dto.limit ?? 5,
          goal: detectedGoal,
          context: dto.context,
        },
      );

    const recommendations =
      recommendationResult.recommendations ?? [];

    return {
      mode: 'feloral_internal_ai_advisor',
      userId,
      question: dto.question ?? null,
      detectedGoal,
      profileSummary: this.buildProfileSummary(profile),
      answer: this.buildAdvisorAnswer(
        profile,
        recommendations,
        detectedGoal,
      ),
      recommendations,
      nextQuestions: this.buildNextQuestions(profile),
      note: 'This is Feloral internal advisor logic. Later it can be connected to a real AI model.',
    };
  }

  private detectGoal(dto: AskAiAdvisorDto, profile: any) {
    const text = [
      dto.question,
      dto.goal,
      dto.context,
      ...(profile.beautyGoals ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (
      text.includes('hydration') ||
      text.includes('آبرسان') ||
      text.includes('خشک')
    ) {
      return 'hydration';
    }

    if (
      text.includes('glow') ||
      text.includes('درخشان') ||
      text.includes('شفاف')
    ) {
      return 'glowing-skin';
    }

    if (
      text.includes('lip') ||
      text.includes('رژ') ||
      text.includes('رژلب')
    ) {
      return 'lipstick';
    }

    if (
      text.includes('perfume') ||
      text.includes('عطر') ||
      text.includes('رایحه')
    ) {
      return 'fragrance';
    }

    if (profile.beautyGoals?.length) {
      return profile.beautyGoals[0];
    }

    return 'personalized-beauty';
  }

  private buildProfileSummary(profile: any) {
    return {
      skinType: profile.skinType,
      undertone: profile.undertone,
      scentFamilies: profile.scentFamilies,
      favoriteNotes: profile.favoriteNotes,
      budgetMin: Number(profile.budgetMin ?? 0),
      budgetMax: Number(profile.budgetMax ?? 0),
      beautyGoals: profile.beautyGoals,
    };
  }

  private buildAdvisorAnswer(
    profile: any,
    recommendations: any[],
    detectedGoal: string,
  ) {
    if (!recommendations.length) {
      return [
        'بر اساس پروفایل زیبایی شما هنوز پیشنهاد کافی پیدا نکردم.',
        'بهتر است محصولات بیشتری با اطلاعات Intelligence و Experience وارد سیستم شوند.',
      ].join(' ');
    }

    const topItem = recommendations[0];

    const productName =
      topItem.product?.name ??
      topItem.product?.englishName ??
      'این محصول';

    const reasons = topItem.reasons?.length
      ? topItem.reasons.join('، ')
      : 'با بخشی از پروفایل شما هماهنگ است';

    return [
      `با توجه به پروفایل شما، مخصوصاً نوع پوست ${profile.skinType ?? 'نامشخص'} و هدف ${detectedGoal}، پیشنهاد اول من ${productName} است.`,
      `دلیل پیشنهاد: ${reasons}.`,
      'این پیشنهاد بر اساس پروفایل زیبایی، بودجه، برندهای مورد علاقه و اطلاعات هوشمند محصولات فلورال ساخته شده است.',
    ].join(' ');
  }

  private buildNextQuestions(profile: any) {
    const questions = [
      'دنبال محصول روزانه هستید یا مناسب مهمانی؟',
      'بافت سبک‌تر دوست دارید یا محصول قوی‌تر؟',
      'بودجه خریدتان همین بازه فعلی است؟',
    ];

    if (profile.skinType === 'dry') {
      questions.push('آیا پوستتان فقط خشک است یا حساسیت هم دارد؟');
    }

    if (profile.undertone === 'warm') {
      questions.push(
        'برای محصولات رنگی، رنگ‌های گرم و نود را ترجیح می‌دهید؟',
      );
    }

    return questions;
  }
}