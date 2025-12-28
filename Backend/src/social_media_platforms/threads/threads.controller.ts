import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThreadsService } from './threads.service';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

interface AuthenticatedRequest extends Request {
  user?: { id: number; email?: string; name?: string };
}

class PostThreadsDto {
  content: string;
  mediaUrl?: string;
}

@Controller('threads')
export class ThreadsController {
  constructor(
    private readonly threadsService: ThreadsService,
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!code) throw new BadRequestException('Authorization code missing');

    try {
      let userId = 1; 
      if (state) {
        try {
          const decoded = JSON.parse(decodeURIComponent(state));
          userId = decoded.userId;
        } catch (e) {
          console.error('Failed to decode state:', e);
        }
      }

      // ✅ Exchange Code for Long-Lived Tokens
      const tokens = await this.threadsService.exchangeCodeForTokens(code);
      const { access_token, user_id, expires_in } = tokens;

      if (!access_token || !user_id)
        throw new InternalServerErrorException('Invalid Threads token response');

      // ✅ Calculate expiration date
      const expiresAt = expires_in 
        ? new Date(Date.now() + expires_in * 1000) 
        : null;

      console.log(`💾 Saving Threads Token. User: ${userId}, Expires: ${expiresAt}`);

      await this.prisma.socialAccount.upsert({
        where: {
          provider_providerId: {
            provider: 'threads',
            providerId: user_id.toString(),
          },
        },
        update: {
          accessToken: access_token,
          expiresAt: expiresAt, // ✅ Correctly update expiration
          userId: userId,
          updatedAt: new Date(),
        },
        create: {
          provider: 'threads',
          providerId: user_id.toString(),
          accessToken: access_token,
          expiresAt: expiresAt, // ✅ Correctly set expiration
          userId: userId,
        },
      });
      
      res.redirect('http://localhost:3000/ActivePlatforms?threads=connected');
      
    } catch (error) {
      console.error('Threads callback error:', error);
      throw new InternalServerErrorException('Failed to authenticate with Threads');
    }
  }

  @Post('post')
  @UseInterceptors(FileInterceptor('file'))
  async postToThreads(
    @Body() body: PostThreadsDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    const { content } = body;
    let { mediaUrl } = body;
    const userId = req.user?.id || 1;

    if (file) {
      try {
        mediaUrl = await this.cloudinaryService.uploadFile(file);
      } catch (error) {
        throw new InternalServerErrorException('Failed to upload media file');
      }
    }

    if (!content && !mediaUrl)
      throw new BadRequestException('Content or media URL required');

    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'threads' },
    });

    if (!account || !account.accessToken)
      throw new UnauthorizedException('User not connected to Threads');

    return this.threadsService.postToThreads(account.accessToken, content, mediaUrl);
  }
}
