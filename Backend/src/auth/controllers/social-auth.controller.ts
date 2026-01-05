import { Controller, Get, UseGuards, Req, Res, Query, BadRequestException, Delete, Param } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { SocialAuthService } from '../services/social-auth.service';
import { LogoutService } from '../services/logout-services';
import { PrismaService } from 'src/prisma/prisma.service';
@Controller('auth')
export class SocialAuthController {
  constructor(
    private configService: ConfigService,
    private socialauthservice :SocialAuthService,
    private logoutService: LogoutService,
    private prisma: PrismaService,
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
    const promptValue = reconnect === 'true' ? 'consent select_account' : 'consent';
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
                   `&scope=${encodeURIComponent('email,pages_manage_posts,pages_read_engagement,pages_show_list,pages_read_user_content,instagram_basic,instagram_content_publish,business_management,instagram_manage_insights,instagram_manage_comments,pages_manage_metadata,pages_manage_ads')}`;
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