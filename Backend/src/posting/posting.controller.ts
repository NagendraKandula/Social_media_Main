import { Controller, Post, Body, UseGuards, Request, Get, Query , Patch,Param,ParseIntPipe,Delete } from '@nestjs/common';
import { PostingService } from './posting.service';
import { CreatePostDto } from './dto/create-post.dto';
import { StorageService } from '../storage/storage.service'; // Import Storage
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { UpdatePostDto } from './dto/update-post.dto';

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
    //console.log("usere_id", req.user.userId);
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
    // Parse the offset from string to number (defaults to 0 if not provided)
    const weekOffset = parseInt(offset, 10) || 0;
    return this.postingService.getScheduledPosts(req.user.id, weekOffset);
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
}