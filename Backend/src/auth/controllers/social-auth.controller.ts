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
    async googleAuth(@Req() req) {
      // Initiates the Google OAuth2 login flow
    }
  
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
    const promptValue = reconnect === 'true' ? 'select_account consent' : 'select_account';
     const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                   `client_id=${process.env.YOUTUBE_CLIENT_ID}` +
                   `&redirect_uri=${encodeURIComponent(process.env.YOUTUBE_CALLBACK_URL!)}` +
                   `&response_type=code` +
                   `&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload')}` +
                   `&access_type=offline` +
                  `&prompt=${encodeURIComponent(promptValue)}` + // Only one prompt parameter allowed
                 `&state=${state}`;
     return res.redirect(oauthUrl);

    // This route is never hit directly because the guard redirects to YouTube
  }

  @Get('youtube/callback')
  @UseGuards(AuthGuard('youtube'))
  async youtubeAuthRedirect(@Req() req, @Res() res: Response) {
    
    const { accessToken, refreshToken, youtubeId, displayName } = req.user;

  // Extract app user from state
  const state = JSON.parse(decodeURIComponent(req.query.state as string));
  const appUserId = state.userId;

  if (!appUserId) {
    throw new BadRequestException('App user not found in state');
  }

  // Call service to link YouTube account
  return this.socialauthservice.youtubeLogin(req, res, appUserId);
  }





   @Get('facebook')
  @UseGuards(JwtAuthGuard)
  async facebookAuth(@Req() req,@Res() res: Response,@Query('reconnect') reconnect?: string) {
    const userId = req.user.id;
    const existing = await this.prisma.socialAccount.findFirst({
      where: {
        userId: userId,
        provider: 'facebook',
      },
    });
    if (existing && reconnect !== 'true') {
    // Redirect them back to the dashboard or management page instead of FB
    const frontendUrl = this.configService.get('FRONTEND_URL');
    return res.redirect(`${frontendUrl}/ActivePlatforms?error=already_connected`);
  }
    const state = encodeURIComponent(JSON.stringify({ userId }));
    const forcePrompt = reconnect === 'true' ? '&auth_type=reauthenticate&prompt=login' : '';
     const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
                   `client_id=${process.env.FACEBOOK_APP_ID}` +
                   `&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_CALLBACK_URL!)}` +
                   `&state=${state}${forcePrompt}` +
                   `&scope=${encodeURIComponent('email,pages_manage_posts,pages_read_engagement,pages_show_list,pages_read_user_content,instagram_basic,instagram_content_publish,business_management')}`;
     return res.redirect(oauthUrl);
    // Initiates the Facebook OAuth2 login flow
  }






  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  facebookAuthRedirect(@Req() req, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, facebookId, name, email } = req.user;
    const state = JSON.parse(decodeURIComponent(req.query.state as string));
    const appUserId = state.userId;
    if (!appUserId) {
      throw new BadRequestException('App user not found in state');
    }

    // You can create a new service method for this or reuse the googleLogin logic
    return this.socialauthservice.facebookLogin(req, res,appUserId);
  }



@Get('threads')
  @UseGuards(JwtAuthGuard)
  async threadsAuth(@Req() req, @Res() res: Response, @Query('reconnect') reconnect?: string) {
    const userId = req.user.id;

    // 1. Check if already connected
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'threads' },
    });

    if (existing && reconnect !== 'true') {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=already_connected`);
    }

    // 2. Encode User ID in state (so we know who is logging in during the callback)
    const state = encodeURIComponent(JSON.stringify({ userId }));

    // 3. Construct Threads OAuth URL
    const clientId = process.env.THREADS_APP_ID;
    // ensure this matches the URI you set in your Meta Developer Console
    const redirectUri = process.env.THREADS_REDIRECT_URI || 'https://unsecretive-unlearned-alexzander.ngrok-free.dev/threads/callback'; 
    const scope = 'threads_basic,threads_content_publish';

    const oauthUrl = `https://threads.net/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${state}`;

    return res.redirect(oauthUrl);
  } 
  
  
@Get('twitter')
  @UseGuards(JwtAuthGuard)
  async twitterAuth(@Req() req, @Res() res: Response, @Query('reconnect') reconnect?: string) {
    const userId = req.user.id; // user.id or user.userId depending on your strategy

    // 1. Check if already connected
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'twitter' },
    });

    if (existing && reconnect !== 'true') {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=already_connected`);
    }

    // 2. Generate Auth URL with UserId
    const { url, state, codeVerifier } = this.twitterService.generateAuthUrl(userId);

    // 3. Store code_verifier in cookie (Needed for PKCE)
    res.cookie('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 300000, // 5 minutes
      path: '/',
    });

    return res.redirect(url);
  }

  @Get('linkedin')
  @UseGuards(JwtAuthGuard)
  async linkedinAuth(@Req() req, @Res() res: Response, @Query('reconnect') reconnect?: string) {
    const userId = req.user.id;

    // 1. Check if already connected
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, provider: 'linkedin' },
    });

    if (existing && reconnect !== 'true') {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=already_connected`);
    }

    // 2. Generate Auth URL
    const url = this.linkedinService.generateAuthUrl(userId);

    // 3. Redirect
    return res.redirect(url);
  }

  // ✅ ADD THIS: LinkedIn Callback Route
  @Get('linkedin/callback')
  async linkedinAuthRedirect(@Req() req, @Res() res: Response, @Query('code') code: string, @Query('state') state: string, @Query('error') error: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (error) {
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=linkedin_denied`);
    }
    
    if (!code || !state) {
        return res.redirect(`${frontendUrl}/ActivePlatforms?error=invalid_request`);
    }

    try {
      // 1. Decode State to get User ID
      const decodedState = JSON.parse(decodeURIComponent(state));
      const userId = decodedState.userId;

      // 2. Exchange Code for Token
      const tokens = await this.linkedinService.exchangeCodeForToken(code);

      // 3. Get Profile Info
      const profile = await this.linkedinService.getUserProfile(tokens.access_token);
      const linkedinId = profile.sub; 

      // 4. Save to Database
      await this.prisma.socialAccount.upsert({
        where: {
          provider_providerId: {
            provider: 'linkedin',
            providerId: linkedinId,
          },
        },
        update: {
          userId: userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          updatedAt: new Date(),
        },
        create: {
          provider: 'linkedin',
          providerId: linkedinId,
          userId: userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      return res.redirect(`${frontendUrl}/ActivePlatforms?linkedin=connected`);

    } catch (error) {
      console.error('LinkedIn Login Error:', error);
      return res.redirect(`${frontendUrl}/ActivePlatforms?error=linkedin_failed`);
    }
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
    const { accessToken, refreshToken, instagramId, username } = req.user;

  // Extract app user from state
  const state = JSON.parse(decodeURIComponent(req.query.state as string));
  const appUserId = state.userId;
  if (!appUserId) {
    throw new BadRequestException('App user not found in state');
  }
  return this.socialauthservice.instagramLogin(req, res, appUserId);
}
}