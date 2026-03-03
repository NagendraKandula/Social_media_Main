import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { InstagramBusinessService } from './instagram-business.service';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard'; // Adjust path to your JWT Guard
import { PrismaService } from '../../prisma/prisma.service'; // Adjust path to Prisma

@Controller('instagram-business')
export class InstagramBusinessController {
  constructor(
    private readonly instagramBusinessService: InstagramBusinessService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('publish')
  @UseGuards(JwtAuthGuard)
  async publishContent(@Req() req, @Body() body: any) {
    const userId = req.user.id; // Current logged-in User ID
    const { mediaType, mediaUrl,mediaUrls, caption } = body;

    // 1️⃣ Validation
    const validTypes = ['IMAGE','VIDEO', 'REELS', 'STORIES', 'CAROUSEL'];
    if (!validTypes.includes(mediaType)) {
      throw new BadRequestException('mediaType must be IMAGE, REELS, or STORIES');
    }
    // For CAROUSEL, we expect an array of media URLs instead of a single URL
    if (mediaType === 'CAROUSEL') {
      if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length < 2) {
        throw new BadRequestException('mediaUrls array with at least 2 items is required for CAROUSEL');
      }
      if (mediaUrls.length > 10) {
        throw new BadRequestException('A maximum of 10 items is allowed in a carousel');
      }
    } else {
      if (!mediaUrl) {
        throw new BadRequestException('mediaUrl is required for single posts');
      }
    }

    // 2️⃣ Fetch Stored Token from Database
    // We look for the 'instagram' provider we saved earlier
    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: {
        userId: userId,
        provider: 'instagram', 
      },
    });

    if (!socialAccount) {
      throw new BadRequestException('Please connect your Instagram account first.');
    }

    // Pass the correct media source (array vs string) down to the service
    const mediaSource = mediaType === 'CAROUSEL' ? mediaUrls : mediaUrl;
    // 3️⃣ Execute Publish
    // providerId is the Instagram Business Account ID
    return this.instagramBusinessService.publishContent(
      socialAccount.providerId, 
      socialAccount.accessToken,
      mediaType,
      mediaSource,
      caption,
    );
  }
}