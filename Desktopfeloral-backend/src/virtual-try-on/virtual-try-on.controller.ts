import { WorkerService } from './worker/worker.service';
import {
 Controller,
 Post,
 Body,
 Get,
 Param,
 ParseIntPipe,
 UploadedFile,
 UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { VirtualTryOnService } from './virtual-try-on.service';
import { CreateTryOnSessionDto } from './dto/create-try-on-session.dto';


@Controller('virtual-try-on')
export class VirtualTryOnController {


 constructor(
 private readonly service: VirtualTryOnService,
 private readonly worker: WorkerService,
) {}



 @Post('session')
 create(
   @Body() dto:CreateTryOnSessionDto,
 ){

   // فعلاً تستی
   const userId = 3;

   return this.service.createSession(
     userId,
     dto,
   );

 }



 @Get('session/:id')
 find(
   @Param('id',ParseIntPipe) id:number,
 ){

   return this.service.findSession(id);

 }

@Post('worker/process')
processJob() {
  return this.worker.processJobs();
}
@Post('session/:id/image')
@UseInterceptors(
  FileInterceptor('image'),
)
uploadImage(
  @Param('id', ParseIntPipe) id: number,
  @UploadedFile() file: Express.Multer.File,
) {

  return this.service.uploadImage(
    id,
    file,
  );
}
}