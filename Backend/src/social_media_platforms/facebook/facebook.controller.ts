import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  Get, // Import Get
} from '@nestjs/common';
// No longer need FileInterceptor or UploadedFile
import { FacebookService } from './facebook.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';

// Updated interface for the request body
interface CreatePostBody {
  content: string;
  pageId: string; // The dynamic page ID from the frontend
  mediaUrl: string; // The public URL of the image or video
  mediaType: 'IMAGE' | 'VIDEO' | 'STORY' | 'REEL'; // Specify what we're posting
}

@Controller('facebook')
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  /**
   * NEW: Endpoint to fetch the user's manageable pages
   */
  @UseGuards(JwtAuthGuard)
  @Get('pages')
  async getPages(@Req() req: any) {
    const userId = req.user.id;
    return this.facebookService.getPages(userId);
  }

  /**
   * UPDATED: 'post' endpoint now uses a JSON body
   */
  @UseGuards(JwtAuthGuard)
  @Post('post')
  // No @UseInterceptors or @UploadedFile needed
  async createPost(@Body() body: CreatePostBody, @Req() req: any) {
   const userId = req.user.id;

    const { content, pageId, mediaUrl, mediaType } = body;

    if (!mediaUrl) {
      throw new BadRequestException('Media URL is required.');
    }
    if (!pageId) {
      throw new BadRequestException('Page ID is required.');
    }
    if (!mediaType) {
      throw new BadRequestException('Media type (IMAGE or VIDEO or STORY) is required.');
    }
    return this.facebookService.postToFacebook(
      userId,
      pageId,
      content,
      mediaUrl,
      mediaType,
    );
  }
}