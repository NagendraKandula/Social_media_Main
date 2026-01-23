import { Controller, Get, UseGuards, Req, Res, Query, BadRequestException, Delete, Param } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { SocialAuthService } from '../services/social-auth.service';
import { LogoutService } from '../services/logout-services';
import { PrismaService } from 'src/prisma/prisma.service';
import { TwitterService } from '../../social_media_platforms/twitter/twitter.service';
import { LinkedinService } from '../../social_media_platforms/linkedin/linkedin.service';

@Controller('auth')
export class SocialAuthController {
  constructor(
    private configService: ConfigService,
    private socialauthservice :SocialAuthService,
    private logoutService: LogoutService,
    private prisma: PrismaService,
    private twitterService: TwitterService,
    private linkedinService: LinkedinService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}
  
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req, @Res({ passthrough: true }) res: Response) {
    return this.socialauthservice.googleLogin(req, res);
  }

  @Get('youtube')
  @UseGuards(JwtAuthGuard)
  async redirectToYoutube(@Req() req,@Res() res: Response,@Query('reconnect') reconnect?: string) {
    const userId = req.user.id;
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'youtube' },
    });
    if (existing && reconnect !== 'true') {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=already_connected`);
    } 
    
    const state = encodeURIComponent(JSON.stringify({ userId }));
    const promptValue = reconnect === 'true' ? 'consent select_account' : 'consent';
     const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                   `client_id=${process.env.YOUTUBE_CLIENT_ID}` +
                   `&redirect_uri=${encodeURIComponent(process.env.YOUTUBE_CALLBACK_URL!)}` +
                   `&response_type=code` +
                   `&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload')}` +
                   `&access_type=offline` +
                  `&prompt=${encodeURIComponent(promptValue)}` + 
                 `&state=${state}`;
     return res.redirect(oauthUrl);
  }

  @Get('youtube/callback')
  @UseGuards(AuthGuard('youtube'))
  async youtubeAuthRedirect(@Req() req, @Res() res: Response) {
    const state = JSON.parse(decodeURIComponent(req.query.state as string));
    const appUserId = state.userId;
    if (!appUserId) {
      throw new BadRequestException('App user not found in state');
    }
    return this.socialauthservice.youtubeLogin(req, res, appUserId);
  }

  @Get('facebook')
  @UseGuards(JwtAuthGuard)
  async facebookAuth(@Req() req,@Res() res: Response,@Query('reconnect') reconnect?: string) {
    const userId = req.user.id;
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'facebook' },
    });
    if (existing && reconnect !== 'true') {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=already_connected`);
    }
    const state = encodeURIComponent(JSON.stringify({ userId }));
    const forcePrompt = reconnect === 'true' ? '&auth_type=reauthenticate&prompt=login' : '';
     const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
                   `client_id=${process.env.FACEBOOK_APP_ID}` +
                   `&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_CALLBACK_URL!)}` +
                   `&state=${state}${forcePrompt}` +
                   `&scope=${encodeURIComponent('email,pages_manage_posts,pages_read_engagement,pages_show_list,pages_read_user_content,instagram_basic,instagram_content_publish,business_management,instagram_manage_insights,instagram_manage_comments,pages_manage_metadata')}`;
     return res.redirect(oauthUrl);
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  facebookAuthRedirect(@Req() req, @Res({ passthrough: true }) res: Response) {
    const state = JSON.parse(decodeURIComponent(req.query.state as string));
    const appUserId = state.userId;
    if (!appUserId) throw new BadRequestException('App user not found in state');
    return this.socialauthservice.facebookLogin(req, res, appUserId);
  }

 @Get('threads')
  @UseGuards(JwtAuthGuard)
  async threadsAuth(@Req() req, @Res() res: Response, @Query('reconnect') reconnect?: string) {
    const userId = req.user.id;
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'threads' },
    });

    if (existing && reconnect !== 'true') {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=already_connected`);
    }
    // Manual State Construction
    const state = encodeURIComponent(JSON.stringify({ userId }));
    
    const clientId = process.env.THREADS_APP_ID;
    const redirectUri = process.env.THREADS_REDIRECT_URL; 
    const scope = 'threads_basic,threads_content_publish';

    // Manual URL Building
    const oauthUrl = `https://threads.net/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${state}`;

    return res.redirect(oauthUrl);
  }

  @Get('threads/callback')
  @UseGuards(AuthGuard('threads')) // This exchanges code -> token using the Strategy
  async threadsAuthRedirect(@Req() req, @Res() res: Response) {
    // 1. Manually decode the state to find out WHO logged in
    const state = JSON.parse(decodeURIComponent(req.query.state as string));
    const appUserId = state.userId;

    if (!appUserId) {
      throw new BadRequestException('App user not found in state');
    }

    // 2. Call the service to save everything
    return this.socialauthservice.threadsLogin(req, res, appUserId);
  }


  
  @Get('twitter')
  @UseGuards(JwtAuthGuard)
  async twitterAuth(@Req() req, @Res() res: Response, @Query('reconnect') reconnect?: string) {
    const userId = req.user.id;
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'twitter' },
    });

    if (existing && reconnect !== 'true') {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=already_connected`);
    }

    const { url, codeVerifier } = this.twitterService.generateAuthUrl(userId);

    res.cookie('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 300000, 
      path: '/',
    });

    return res.redirect(url);
  }


  

  @Get('linkedin')
  @UseGuards(JwtAuthGuard)
  async linkedinAuth(@Req() req, @Res() res: Response, @Query('reconnect') reconnect?: string) {
    const userId = req.user.id;
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'linkedin' },
    });

    if (existing && reconnect !== 'true') {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=already_connected`);
    }
    // Manual State
    const state = encodeURIComponent(JSON.stringify({ userId }));
    const callbackUrl = process.env.LINKEDIN_CALLBACK_URL;
    if (!callbackUrl) {
        return res.status(400).send("Error: LINKEDIN_CALLBACK_URL is missing in .env");
    }
    // Manual URL Construction
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = encodeURIComponent(callbackUrl);
    const scope = encodeURIComponent('openid profile email w_member_social');
    
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

    return res.redirect(url);
  }

  // ✅ LinkedIn Callback - Cleaned up and delegating to Service
  @Get('linkedin/callback')
  @UseGuards(AuthGuard('linkedin')) // 👈 Strategy handles token exchange now
  async linkedinAuthRedirect(@Req() req, @Res() res: Response) {
    // 1. Decode State
    const state = JSON.parse(decodeURIComponent(req.query.state as string));
    const appUserId = state.userId;

    if (!appUserId) throw new BadRequestException('User ID not found');

    // 2. Call Service
    return this.socialauthservice.linkedinLogin(req, res, appUserId);
  }

  @Get('instagram')
  @UseGuards(JwtAuthGuard)
  async redirectToInstagram(@Req() req,@Res() res: Response,@Query('reconnect') reconnect?: string) {
    const userId = req.user.id;
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'instagram' },
    });
    if (existing && reconnect !== 'true') {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=already_connected`);
    }
    const state = encodeURIComponent(JSON.stringify({ userId }));
    const forcePrompt = reconnect === 'true' ? '&auth_type=reauthenticate&prompt=login' : '';
     const oauthUrl = `https://www.instagram.com/oauth/authorize?` +
                   `client_id=${process.env.INSTAGRAM_APP_ID}` +
                   `&redirect_uri=${encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URL!)}` +
                   `&response_type=code` +
                   `&scope=${encodeURIComponent('instagram_business_basic instagram_business_manage_messages instagram_business_manage_comments instagram_business_content_publish')}` +
                 `&state=${state}${forcePrompt}` ;
     return res.redirect(oauthUrl);
  }

  @Get('instagram/callback')
  @UseGuards(AuthGuard('instagram'))
  async instagramAuthRedirect(@Req() req, @Res() res: Response) {
    const state = JSON.parse(decodeURIComponent(req.query.state as string));
    const appUserId = state.userId;
    if (!appUserId) {
      throw new BadRequestException('App user not found in state');
    }
    return this.socialauthservice.instagramLogin(req, res, appUserId);
  }
}