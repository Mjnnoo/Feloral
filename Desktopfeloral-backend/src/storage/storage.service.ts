import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { resolve, join } from 'path';


const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};


@Injectable()
export class StorageService {


  async saveImage(
    file: Express.Multer.File,
    folder: string,
  ) {

    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'فایل تصویر ارسال نشده است',
      );
    }


    const extension =
      IMAGE_EXTENSION_BY_MIME[file.mimetype];


    if (!extension) {
      throw new BadRequestException(
        'فرمت تصویر پشتیبانی نمی‌شود',
      );
    }


    const uploadDirectory =
      resolve(
        process.cwd(),
        'uploads',
        folder,
      );


    await mkdir(
      uploadDirectory,
      {
        recursive:true,
      },
    );


    const filename =
      `${randomUUID()}${extension}`;


    const target =
      join(
        uploadDirectory,
        filename,
      );


    await writeFile(
      target,
      file.buffer,
      {
        flag:'wx',
      },
    );


    return {
      filename,
      imageUrl:
        `/uploads/${folder}/${filename}`,
    };

  }

}