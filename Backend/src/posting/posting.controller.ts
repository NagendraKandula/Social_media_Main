import { Controller, Post, Body, UseGuards, Request, Get, Query, Patch, Param, ParseIntPipe, Delete } from '@nestjs/common';
import { PostingService } from './posting.service';
import { CreatePostDto } from './dto/create-post.dto';
import { StorageService } from '../storage/storage.service'; 
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { UpdatePostDto } from './dto/update-post.dto';
import { MediaType } from '@prisma/client';

@Controller('posting')
export class PostingController {
  constructor(
    private readonly postingService: PostingService,
    private readonly storageService: StorageService
  ) {}

  // 1. Get Pre-Signed URL for Upload
  @Get('presigned-url')
  @UseGuards(JwtAuthGuard)
  async getPresignedUrl(@Request() req, @Query('fileName') fileName: string, @Query('contentType') contentType: string) {
    return this.storageService.getPresignedUrl(fileName, contentType, req.user.id);
  }

  // 2. Create the Post
  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createPostDto: CreatePostDto) {
    return this.postingService.createPost(req.user.id, createPostDto);
  }

  @Get('scheduled')
  @UseGuards(JwtAuthGuard)
  async getScheduledPosts(
    @Request() req, 
    @Query('offset') offset: string
  ) {
    const weekOffset = parseInt(offset, 10) || 0;
    return this.postingService.getScheduledPosts(req.user.id, weekOffset);
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  async getPostStatus(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.postingService.getPostStatus(req.user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto
  ) {
    return this.postingService.updatePost(req.user.id, id, updatePostDto);
  }

  // 3. PATCH Reschedule time from Drag & Drop
  @Patch(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  async reschedulePost(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('scheduledAt') scheduledAt: string
  ) {
    return this.postingService.reschedulePost(req.user.id, id, scheduledAt);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePost(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.postingService.deletePost(req.user.id, id);
  }
  @Post('media/register')
  @UseGuards(JwtAuthGuard)
  async registerMedia(
    @Request() req, 
    @Body() body: { gcsPath: string; fileType: MediaType }
  ) {
    return this.postingService.registerMedia(req.user.id, body.gcsPath, body.fileType);
  }
}