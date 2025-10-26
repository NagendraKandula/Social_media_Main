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

// Define a simple DTO for the request body
class InstagramPostDto {
  content: string;
  mediaUrl: string;
}

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Post('post')
  async postToInstagram(
    @Req() req: Request,
    @Body() postDto: InstagramPostDto,
  ) {
    const accessToken = req.cookies['facebook_access_token'];
    if (!accessToken) {
      throw new BadRequestException('Facebook access token not found');
    }

    const { content, mediaUrl } = postDto;
    if (!mediaUrl) {
      throw new BadRequestException('Media URL is required');
    }

    // You might want to infer mediaType from the URL (e.g., .mp4, .mov)
    // For this example, we'll assume .jpg/.png are 'IMAGE' and .mp4/.mov are 'VIDEO'
    // A more robust solution would check MIME types or API requirements
    let mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE';
    if (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.mov')) {
      mediaType = 'VIDEO';
    }

    return this.instagramService.postToInstagram(
      accessToken,
      content,
      mediaUrl,
      mediaType,
    );
  }
}