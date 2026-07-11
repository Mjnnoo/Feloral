import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EditableContentType,
  HomepageSectionStatus,
  HomepageSectionType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateContentDto } from './dto/update-content.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { UpsertContentDto } from './dto/upsert-content.dto';
import { UpsertMediaUrlDto } from './dto/upsert-media-url.dto';
import { UpsertSectionDto } from './dto/upsert-section.dto';

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly contentInclude = {
    media: true,
    section: true,
  };

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }

  private async getSectionIdByKey(sectionKey?: string | null) {
    if (!sectionKey) {
      return undefined;
    }

    const section = await this.prisma.homepageSection.findUnique({
      where: { key: sectionKey },
      select: { id: true },
    });

    if (!section) {
      throw new NotFoundException('سکشن مورد نظر پیدا نشد');
    }

    return section.id;
  }

  async getPublicTheme() {
    const theme = await this.prisma.themeSetting.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    return (
      theme ?? {
        name: 'default',
        primaryFont: 'Vazirmatn',
        headingFont: 'Vazirmatn',
        bodyFont: 'Vazirmatn',
        buttonFont: 'Vazirmatn',
        accentColor: '#d6a84f',
        backgroundColor: '#f6f0e8',
        textColor: '#101010',
        darkColor: '#070707',
        logoText: 'FELORAL',
        availableFonts: [
          'Vazirmatn',
          'Yekan Bakh',
          'IRANSansX',
          'Dana',
          'Peyda',
          'Morabba',
          'Estedad',
        ],
      }
    );
  }

  async getTheme() {
    const theme = await this.prisma.themeSetting.findFirst({
      orderBy: {
        id: 'asc',
      },
    });

    if (theme) {
      return theme;
    }

    return this.prisma.themeSetting.create({
      data: {
        id: 1,
        name: 'default',
        primaryFont: 'Vazirmatn',
        headingFont: 'Vazirmatn',
        bodyFont: 'Vazirmatn',
        buttonFont: 'Vazirmatn',
        accentColor: '#d6a84f',
        backgroundColor: '#f6f0e8',
        textColor: '#101010',
        darkColor: '#070707',
        logoText: 'FELORAL',
        availableFonts: [
          'Vazirmatn',
          'Yekan Bakh',
          'IRANSansX',
          'Dana',
          'Peyda',
          'Morabba',
          'Estedad',
        ],
      },
    });
  }

  async updateTheme(dto: UpdateThemeDto) {
    const existing = await this.getTheme();

    return this.prisma.themeSetting.update({
      where: {
        id: existing.id,
      },
      data: {
        name: dto.name,
        primaryFont: dto.primaryFont,
        headingFont: dto.headingFont,
        bodyFont: dto.bodyFont,
        buttonFont: dto.buttonFont,
        accentColor: dto.accentColor,
        backgroundColor: dto.backgroundColor,
        textColor: dto.textColor,
        darkColor: dto.darkColor,
        logoText: dto.logoText,
        logoImageId: dto.logoImageId === null ? null : dto.logoImageId,
        availableFonts: this.toJson(dto.availableFonts),
        isActive: dto.isActive,
      },
    });
  }

  async getPublicHomepage() {
    const [theme, sections] = await Promise.all([
      this.getPublicTheme(),
      this.prisma.homepageSection.findMany({
        where: {
          status: HomepageSectionStatus.published,
          isPublic: true,
        },
        include: {
          contents: {
            where: {
              isPublic: true,
            },
            include: {
              media: true,
            },
            orderBy: {
              id: 'asc',
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      }),
    ]);

    return {
      theme,
      sections,
    };
  }

  async getAdminHomepage() {
    const [theme, sections] = await Promise.all([
      this.getTheme(),
      this.prisma.homepageSection.findMany({
        include: {
          contents: {
            include: {
              media: true,
            },
            orderBy: {
              id: 'asc',
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      }),
    ]);

    return {
      theme,
      sections,
      editor: {
        enabled: true,
        message: 'این خروجی مخصوص ادمین است و شامل آیتم‌های مخفی و قابل ویرایش است',
      },
    };
  }

  getContents() {
    return this.prisma.editableContent.findMany({
      include: this.contentInclude,
      orderBy: {
        key: 'asc',
      },
    });
  }

  async upsertContent(dto: UpsertContentDto) {
    if (!dto.key) {
      throw new BadRequestException('کلید محتوا الزامی است');
    }

    const sectionId = await this.getSectionIdByKey(dto.sectionKey);

    return this.prisma.editableContent.upsert({
      where: {
        key: dto.key,
      },
      create: {
        key: dto.key,
        type: dto.type ?? EditableContentType.text,
        title: dto.title,
        plainText: dto.plainText,
        value: this.toJson(dto.value),
        sectionId,
        mediaId: dto.mediaId,
        fontFamily: dto.fontFamily,
        fontWeight: dto.fontWeight,
        color: dto.color,
        isPublic: dto.isPublic ?? true,
        isEditable: dto.isEditable ?? true,
      },
      update: {
        type: dto.type,
        title: dto.title,
        plainText: dto.plainText,
        value: this.toJson(dto.value),
        sectionId,
        mediaId: dto.mediaId,
        fontFamily: dto.fontFamily,
        fontWeight: dto.fontWeight,
        color: dto.color,
        isPublic: dto.isPublic,
        isEditable: dto.isEditable,
      },
      include: this.contentInclude,
    });
  }

  async updateContent(key: string, dto: UpdateContentDto) {
    const existing = await this.prisma.editableContent.findUnique({
      where: {
        key,
      },
    });

    if (!existing) {
      throw new NotFoundException('محتوای مورد نظر پیدا نشد');
    }

    const sectionId =
      dto.sectionKey === undefined
        ? undefined
        : await this.getSectionIdByKey(dto.sectionKey);

    return this.prisma.editableContent.update({
      where: {
        key,
      },
      data: {
        type: dto.type,
        title: dto.title,
        plainText: dto.plainText,
        value: this.toJson(dto.value),
        sectionId: dto.sectionKey === null ? null : sectionId,
        mediaId: dto.mediaId === null ? null : dto.mediaId,
        fontFamily: dto.fontFamily === null ? null : dto.fontFamily,
        fontWeight: dto.fontWeight === null ? null : dto.fontWeight,
        color: dto.color === null ? null : dto.color,
        isPublic: dto.isPublic,
        isEditable: dto.isEditable,
      },
      include: this.contentInclude,
    });
  }

  getSections() {
    return this.prisma.homepageSection.findMany({
      include: {
        contents: {
          include: {
            media: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async upsertSection(dto: UpsertSectionDto) {
    if (!dto.key) {
      throw new BadRequestException('کلید سکشن الزامی است');
    }

    return this.prisma.homepageSection.upsert({
      where: {
        key: dto.key,
      },
      create: {
        key: dto.key,
        type: dto.type ?? HomepageSectionType.custom,
        status: dto.status ?? HomepageSectionStatus.published,
        title: dto.title,
        sortOrder: dto.sortOrder ?? 0,
        settings: this.toJson(dto.settings),
        isEditable: dto.isEditable ?? true,
        isPublic: dto.isPublic ?? true,
      },
      update: {
        type: dto.type,
        status: dto.status,
        title: dto.title,
        sortOrder: dto.sortOrder,
        settings: this.toJson(dto.settings),
        isEditable: dto.isEditable,
        isPublic: dto.isPublic,
      },
    });
  }

  async updateSection(key: string, dto: UpdateSectionDto) {
    const existing = await this.prisma.homepageSection.findUnique({
      where: {
        key,
      },
    });

    if (!existing) {
      throw new NotFoundException('سکشن مورد نظر پیدا نشد');
    }

    return this.prisma.homepageSection.update({
      where: {
        key,
      },
      data: {
        type: dto.type,
        status: dto.status,
        title: dto.title === null ? null : dto.title,
        sortOrder: dto.sortOrder,
        settings: this.toJson(dto.settings),
        isEditable: dto.isEditable,
        isPublic: dto.isPublic,
      },
    });
  }

  async upsertMediaUrl(dto: UpsertMediaUrlDto) {
    if (!dto.url) {
      throw new BadRequestException('آدرس فایل الزامی است');
    }

    if (dto.key) {
      return this.prisma.mediaAsset.upsert({
        where: {
          key: dto.key,
        },
        create: {
          key: dto.key,
          url: dto.url,
          filename: dto.filename,
          originalName: dto.originalName,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          alt: dto.alt,
          title: dto.title,
          description: dto.description,
          width: dto.width,
          height: dto.height,
          isPublic: dto.isPublic ?? true,
        },
        update: {
          url: dto.url,
          filename: dto.filename,
          originalName: dto.originalName,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          alt: dto.alt,
          title: dto.title,
          description: dto.description,
          width: dto.width,
          height: dto.height,
          isPublic: dto.isPublic,
        },
      });
    }

    return this.prisma.mediaAsset.create({
      data: {
        url: dto.url,
        filename: dto.filename,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        alt: dto.alt,
        title: dto.title,
        description: dto.description,
        width: dto.width,
        height: dto.height,
        isPublic: dto.isPublic ?? true,
      },
    });
  }

  createUploadedMedia(file: Express.Multer.File, body: any) {
    if (!file) {
      throw new BadRequestException('فایل ارسال نشده است');
    }

    const url = `/uploads/cms/${file.filename}`;

    return this.prisma.mediaAsset.create({
      data: {
        key: body?.key || undefined,
        url,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        alt: body?.alt,
        title: body?.title,
        description: body?.description,
        isPublic: body?.isPublic === undefined ? true : body.isPublic === 'true',
      },
    });
  }

  async seedDefaultHomepage() {
    const theme = await this.getTheme();

    const sections = [
      {
        key: 'home.hero',
        type: HomepageSectionType.hero,
        title: 'هیرو صفحه اصلی',
        sortOrder: 10,
        isPublic: true,
        status: HomepageSectionStatus.published,
      },
      {
        key: 'home.benefits',
        type: HomepageSectionType.benefits,
        title: 'مزایای فروشگاه',
        sortOrder: 20,
        isPublic: true,
        status: HomepageSectionStatus.published,
      },
      {
        key: 'home.products',
        type: HomepageSectionType.products,
        title: 'محصولات منتخب',
        sortOrder: 30,
        isPublic: true,
        status: HomepageSectionStatus.published,
      },
      {
        key: 'home.ai.internal',
        type: HomepageSectionType.ai_internal,
        title: 'Feloral AI داخلی',
        sortOrder: 90,
        isPublic: false,
        status: HomepageSectionStatus.hidden,
      },
    ];

    for (const section of sections) {
      await this.upsertSection(section);
    }

    const heroSection = await this.prisma.homepageSection.findUnique({
      where: {
        key: 'home.hero',
      },
      select: {
        id: true,
      },
    });

    const aiSection = await this.prisma.homepageSection.findUnique({
      where: {
        key: 'home.ai.internal',
      },
      select: {
        id: true,
      },
    });

    const heroContents = [
      {
        key: 'home.hero.eyebrow',
        title: 'متن کوچک هیرو',
        plainText: 'عطرهای اورجینال',
        sectionId: heroSection?.id,
      },
      {
        key: 'home.hero.title',
        title: 'عنوان اصلی هیرو',
        plainText: 'تجربه‌ای از لوکس بودن در هر لحظه',
        sectionId: heroSection?.id,
      },
      {
        key: 'home.hero.subtitle',
        title: 'زیرعنوان هیرو',
        plainText: 'معتبرترین برندهای دنیا با ضمانت اصالت کالا',
        sectionId: heroSection?.id,
      },
      {
        key: 'home.hero.cta',
        title: 'متن دکمه هیرو',
        plainText: 'مشاهده محصولات',
        sectionId: heroSection?.id,
      },
    ];

    for (const content of heroContents) {
      await this.prisma.editableContent.upsert({
        where: {
          key: content.key,
        },
        create: {
          key: content.key,
          type: EditableContentType.text,
          title: content.title,
          plainText: content.plainText,
          sectionId: content.sectionId,
          isPublic: true,
          isEditable: true,
        },
        update: {
          title: content.title,
          plainText: content.plainText,
          sectionId: content.sectionId,
          isPublic: true,
          isEditable: true,
        },
      });
    }

    await this.prisma.editableContent.upsert({
      where: {
        key: 'admin.ai.description',
      },
      create: {
        key: 'admin.ai.description',
        type: EditableContentType.text,
        title: 'توضیح داخلی Feloral AI',
        plainText:
          'این بخش فقط برای ادمین است و مشتری نباید آن را در سایت عمومی ببیند',
        sectionId: aiSection?.id,
        isPublic: false,
        isEditable: true,
      },
      update: {
        sectionId: aiSection?.id,
        isPublic: false,
        isEditable: true,
      },
    });

    return {
      message: 'داده‌های اولیه CMS ساخته شد',
      theme,
      homepage: await this.getAdminHomepage(),
    };
  }
}
