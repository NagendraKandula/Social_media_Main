import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { InstagramBusinessService } from './instagram-business.service';

@Controller('instagram-business')
export class InstagramBusinessController {
  private readonly logger = new Logger(InstagramBusinessController.name);

  constructor(
    private readonly instagramBusinessService: InstagramBusinessService,
  ) {}

  // ✅ Step 0: OAuth Callback (after user login)
  @Get('callback')
  async handleInstagramCallback(
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    try {
      if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
      }

      const tokenUrl = 'https://api.instagram.com/oauth/access_token';

      const params = new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID!,
        client_secret: process.env.INSTAGRAM_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri:
          'https://unsecretive-unlearned-alexzander.ngrok-free.dev/instagram-business/callback',
        code,
      });

      const response = await axios.post(tokenUrl, params);
      const { access_token, user_id } = response.data;

      this.logger.log('✅ Access Token:', access_token);
      this.logger.log('✅ User ID:', user_id);

      // Redirect user to your LOCAL frontend success page
      const redirectUrl = 'http://localhost:3000/Landing';

      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('❌ Callback Error:', error.message);
      return res
        .status(400)
        .json({ error: 'Failed to exchange code for token', details: error.message });
    }
  }

  // ✅ Step 1: Verify token and IG user info
  @Get('verify')
  async verifyToken(
    @Query('access_token') accessToken: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.instagramBusinessService.verifyToken(accessToken);
      return res.json(result);
    } catch (error) {
      this.logger.error('❌ Error verifying token:', error.message);
      return res.status(400).json({ error: error.message });
    }
  }

  // ✅ Step 2: Post image + caption
  @Post('post')
  async postToInstagram(
    @Body()
    body: { userId: string; imageUrl: string; caption: string; accessToken: string },
    @Res() res: Response,
  ) {
    try {
      const { userId, imageUrl, caption, accessToken } = body;

      const result = await this.instagramBusinessService.postToInstagram(
        userId,
        imageUrl,
        caption,
        accessToken,
      );

      return res.json(result);
    } catch (error) {
      this.logger.error('❌ Post Error:', error.message);
      return res.status(400).json({ error: error.message });
    }
  }
}