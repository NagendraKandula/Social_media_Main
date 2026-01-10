import { Controller, Post, Body, UseGuards, Request, Get, Query } from '@nestjs/common';
import { PostingService } from './posting.service';
import { CreatePostDto } from './dto/create-post.dto';
import { StorageService } from '../storage/storage.service'; // Import Storage
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

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
    return this.storageService.getPresignedUrl(fileName, contentType, req.user.userId);
  }

  // 2. Create the Post
  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createPostDto: CreatePostDto) {
    return this.postingService.createPost(req.user.userId, createPostDto);
  }
}