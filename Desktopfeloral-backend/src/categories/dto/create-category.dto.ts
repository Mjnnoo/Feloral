export class CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}