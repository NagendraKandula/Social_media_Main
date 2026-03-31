import { Controller, Post, Body, Req, UseGuards, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { LinkedinService } from './linkedin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';

@Controller('linkedin')
export class LinkedinController {
  constructor(
    private readonly linkedinService: LinkedinService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('post')
  @UseGuards(JwtAuthGuard)
  async postContent(
    @Req() req: any, 
    @Body() body: { text: string; mediaList?: Array<{ url: string; type: 'IMAGE' | 'VIDEO' }> }
  ) {
    const userId = req.user.id;
    const { text, mediaList } = body;

    if (!text) throw new BadRequestException('Text is required');
    
    // Validate media items if provided
    if (mediaList && mediaList.length > 0) {
      for (const media of mediaList) {
        if (!media.url || !media.type) {
          throw new BadRequestException('Each media item must have a url and type (IMAGE or VIDEO)');
        }
        if (media.type !== 'IMAGE' && media.type !== 'VIDEO') {
          throw new BadRequestException('Media type must be either IMAGE or VIDEO');
        }
      }
    }

    // Find the connected account
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'linkedin' },
    });

    if (!account || !account.accessToken) {
      throw new UnauthorizedException('LinkedIn account not connected');
    }

    // Call Service with media array
    return this.linkedinService.postToLinkedIn(
      account.accessToken,
      account.providerId, 
      text,
      mediaList
    );
  }
}