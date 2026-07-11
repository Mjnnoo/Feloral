import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // اجازه دسترسی از مرورگر
  app.enableCors();

  // اعتبارسنجی خودکار DTO ها
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(3000);

  console.log('🚀 Server running at http://localhost:3000');
}

bootstrap();