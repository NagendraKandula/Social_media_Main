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
    const { mediaType, mediaUrl, caption } = body;

    // 1️⃣ Validation
    const validTypes = ['IMAGE', 'REELS', 'STORIES'];
    if (!validTypes.includes(mediaType)) {
      throw new BadRequestException('mediaType must be IMAGE, REELS, or STORIES');
    }
    if (!mediaUrl) {
      throw new BadRequestException('mediaUrl is required');
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

    // 3️⃣ Execute Publish
    // providerId is the Instagram Business Account ID
    return this.instagramBusinessService.publishContent(
      socialAccount.providerId, 
      socialAccount.accessToken,
      mediaType,
      mediaUrl,
      caption,
    );
  }
}