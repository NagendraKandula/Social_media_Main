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

  // ✅ Only Post Logic Remains
  @Post('post')
  @UseGuards(JwtAuthGuard)
  async postContent(@Req() req: any, @Body() body: { text: string }) {
    const userId = req.user.id;
    const { text } = body;

    if (!text) throw new BadRequestException('Text is required');

    // Find the connected account
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'linkedin' },
    });

    if (!account || !account.accessToken) {
      throw new UnauthorizedException('LinkedIn account not connected');
    }

    // Call Service
    return this.linkedinService.postToLinkedIn(
      account.accessToken,
      account.providerId, 
      text
    );
  }
}