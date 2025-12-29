import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';

// Updated DTO
class InstagramPostDto {
  content?: string; // Caption (Optional for Stories)
  mediaUrl: string;
  mediaType: 'IMAGE' | 'REEL' | 'STORIES'; // New Field
}

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}
  @UseGuards(JwtAuthGuard)
  @Post('post')
  async postToInstagram(
    @Req() req: any,
    @Body() postDto: InstagramPostDto,
  ) {
    // 1. Get Facebook Token from Cookie
    const userId = req.user.id;
  
    const { content, mediaUrl, mediaType } = postDto;

    if (!mediaUrl) {
      throw new BadRequestException('Media URL is required');
    }

    if (!['IMAGE', 'REEL', 'STORIES'].includes(mediaType)) {
      throw new BadRequestException('Invalid mediaType. Must be IMAGE, REEL, or STORY');
    }
     const safeContent = content || '';
    return this.instagramService.postToInstagram(
      userId,
      safeContent,
      mediaUrl,
      mediaType,
    );
  }
}