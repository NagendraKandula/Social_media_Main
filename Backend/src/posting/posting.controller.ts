import { Controller, Post, Body, UseGuards, Request, Get, Query, Patch, Param, ParseIntPipe, Delete, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PostingService } from './posting.service';
import { CreatePostDto } from './dto/create-post.dto';
import { StorageService } from '../storage/storage.service'; 
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { UpdatePostDto } from './dto/update-post.dto';
import { MediaType } from '@prisma/client';

@Controller('posting')
export class PostingController {
  private readonly logger = new Logger(PostingController.name);

  constructor(
    private readonly postingService: PostingService,
    private readonly storageService: StorageService
  ) {}

  @Get('presigned-url')
  @UseGuards(JwtAuthGuard)
  async getPresignedUrl(@Request() req, @Query('fileName') fileName: string, @Query('contentType') contentType: string) {
    try {
      const userId = req.user.id || req.user.userId; // Safely handle JWT payload differences
      return await this.storageService.generatePresignedUrl(fileName, contentType, userId);
    } catch (error: any) {
      this.logger.error(`Presigned URL Error: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('media/register')
  @UseGuards(JwtAuthGuard)
  async registerMedia(
    @Request() req, 
    @Body() body: { gcsPath: string; fileType: MediaType,width?: number;height?: number;durationMs?: number;fileSizeBytes?: number; }
  ) {
   
      // 🔍 ADD THIS LOG
      this.logger.log(
    `🔵 [REGISTER-MEDIA:API-1] Request entered`,
  );

  this.logger.log(
    `🔵 [REGISTER-MEDIA:API-2] Body=${JSON.stringify(body)}`,
  );
      
      try {
    const userId = req.user.id || req.user.userId;

    this.logger.log(
      `🔵 [REGISTER-MEDIA:API-3] userId=${userId}`,
    );

    this.logger.log(
      `🔵 [REGISTER-MEDIA:API-4] Calling PostingService.registerMedia()`,
    );

    const result = await this.postingService.registerMedia(
      userId,
      body.gcsPath,
      body.fileType,
      body.width,
      body.height,
      body.durationMs,
      body.fileSizeBytes
    );

    this.logger.log(
      `🟢 [REGISTER-MEDIA:API-5] Service returned`,
    );

    this.logger.log(
      `🟢 [REGISTER-MEDIA:API-6] mediaId=${result.id}`,
    );

    return result;
  } catch (error: any) {
    this.logger.error(
      `🔴 [REGISTER-MEDIA:API-ERROR] ${error.message}`,
      error.stack,
    );

    throw new HttpException(
      error.message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createPostDto: CreatePostDto) {
    try {
      const userId = req.user.id || req.user.userId;
      return await this.postingService.createPost(userId, createPostDto);
    } catch (error: any) {
      this.logger.error(`Create Post Error: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('scheduled')
  @UseGuards(JwtAuthGuard)
  async getScheduledPosts(@Request() req, @Query('offset') offset: string) {
    try {
      const userId = req.user.id || req.user.userId;
      const weekOffset = parseInt(offset, 10) || 0;
      console.log('===== Scheduled API Called =====');
         console.log('User:', req.user.id);
        console.log('Offset:', offset);
      return await this.postingService.getScheduledPosts(userId, weekOffset);
    } catch (error: any) {
      this.logger.error(`Get Scheduled Error: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  async getPostStatus(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.id || req.user.userId;
    return this.postingService.getPostStatus(userId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updatePost(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() updatePostDto: UpdatePostDto) {
    const userId = req.user.id || req.user.userId;
    return this.postingService.updatePost(userId, id, updatePostDto);
  }

  @Patch(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  async reschedulePost(@Request() req, @Param('id', ParseIntPipe) id: number, @Body('scheduledAt') scheduledAt: string) {
    const userId = req.user.id || req.user.userId;
    return this.postingService.reschedulePost(userId, id, scheduledAt);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.id || req.user.userId;
    return this.postingService.deletePost(userId, id);
  }
}