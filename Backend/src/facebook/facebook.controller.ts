import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FacebookService } from './facebook.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
 interface CreatePostBody{
  content: string;
  duration?: string;
  width?: string;
  height?: string;
}
@Controller('facebook')
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  @UseGuards(JwtAuthGuard)
  @Post('post')
  @UseInterceptors(FileInterceptor('media'))
  async createPost(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreatePostBody,
    @Req() req: Request,
  ) {
    const accessToken = req.cookies['facebook_access_token'];

    // --- CORRECTED FUNCTION CALL ---
    // 1. Use the correct function name: postToFacebook
    // 2. Pass all three required arguments: accessToken, content, and the uploaded file.
    if(!accessToken){
      throw new BadRequestException('Facebook access token is missing.');
    }
    if(!file){
      throw new BadRequestException('Media file is required.');
    }
    const { content } = body;
    const duration = body.duration ? parseFloat(body.duration) : undefined;
    const width = body.width ? parseInt(body.width, 10) : undefined;
    const height = body.height ? parseInt(body.height, 10) : undefined;

    return this.facebookService.postToFacebook(accessToken,
       content,
        file,
        duration,
        width,
        height,
        );
  }
}
