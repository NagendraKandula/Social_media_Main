import {
  Controller,
  Post,
  Body,
  Req,
  BadRequestException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';

@Controller('threads')
export class ThreadsController {
  constructor(
    private readonly threadsService: ThreadsService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('post')
  async postToThreads(
    // Inline typing replacing the DTO
    @Body() body: { content?: string; mediaList?: Array<{ url: string; type?: 'IMAGE' | 'VIDEO' }> },
    @Req() req: any,
  ) {
    const { content, mediaList } = body || {};
    const userId = Number(req.user?.id);

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!content && (!mediaList || mediaList.length === 0)) {
      throw new BadRequestException('Content or at least one media URL required');
    }

    if (mediaList && mediaList.length > 0) {
      for (let i = 0; i < mediaList.length; i++) {
        if (!mediaList[i].url) {
          throw new BadRequestException(`Media item ${i + 1} must have a url`);
        }
      }
    }

    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'threads' },
    });

    if (!account || !account.accessToken) {
      throw new UnauthorizedException('User not connected to Threads');
    }

    try {
      const result = await this.threadsService.postToThreads(
        account.accessToken,
        content || '',
        mediaList,
      );

      return {
        postId: result?.postId || 'N/A',
        message: result?.message || 'Post created successfully',
      };
    } catch (error: any) {
      console.error('⚠️ Threads Controller Error:', error?.message);
      throw error;
    }
  }
}