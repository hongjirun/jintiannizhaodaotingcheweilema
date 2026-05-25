import {
  Controller, Post, UseInterceptors,
  UploadedFile, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('后台-文件上传')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/upload')
export class UploadController {
  @Post('image')
  @ApiOperation({ summary: '上传图片（存本地/可替换为OSS）' })
  @UseInterceptors(FileInterceptor('file', {
    dest: './uploads',
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { code: 1, message: '未接收到文件' };
    const url = `/uploads/${file.filename}`;
    return { code: 0, data: { url } };
  }
}
