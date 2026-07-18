// upload/upload.controller.ts
import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { memoryStorage } from 'multer';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('excel')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadExcel(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.processExcel(file);
  }
}