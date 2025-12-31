// src/auth/auth.controller.ts
import { Body, Controller, Post, UseGuards, Get, Request, Res, Req, Scope, HttpCode, HttpStatus,BadRequestException ,Delete ,Param } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { JwtRefreshGuard } from '../guard/jwt-refresh.guard';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config'; 
import {TokenService} from '../services/token.service';
import { LogoutService } from '../services/logout-services';
import { PrismaService } from 'src/prisma/prisma.service';
//import {  YoutubeAuthGuard} from './youtube-auth.guard';
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService,
    private configService: ConfigService,
    private tokenService: TokenService,
    private logoutService: LogoutService,
    private prisma: PrismaService
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('resend-otp')
  resendOtp(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendOtp(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

 @UseGuards(JwtRefreshGuard)
@Post('refresh')
@HttpCode(HttpStatus.OK)
async refreshTokens(@Req() req, @Res({ passthrough: true }) res: Response) {
  const userId = req.user.id;
  const email = req.user.email;
  const refreshToken = req.cookies['refresh_token'];

  // DB logic is encapsulated in the Service
  const tokens = await this.tokenService.rotateTokens(userId, email, refreshToken);

  const cookieOptions = {
    httpOnly: true,
    secure: this.configService.get('NODE_ENV') !== 'development',
    sameSite: 'none' as const,
    path: '/',
  };

  res.cookie('access_token', tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', tokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return { message: 'Tokens rotated successfully' };
}

  @UseGuards(JwtAuthGuard)
@Post('logout')
@UseGuards(JwtAuthGuard)
@HttpCode(HttpStatus.OK)
async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
  const userId = req.user.id;
  return this.authService.logout(userId, res);
}
  
 

 
@UseGuards(JwtAuthGuard)
@Get('social/active-accounts')
async getActiveAccounts(@Req() req) {
  const userId = req.user.id; // From JwtAuthGuard
  //console.log(`Fetching active platforms for UserId: ${userId}`);
  // Use the new service to get the profile
  const [facebook,instagram,youtube] = await Promise.all([
    this.logoutService.getFacebookProfile(userId),
    this.logoutService.getInstagramProfile(userId),
    this.logoutService.getYoutubeProfile(userId),
  ]);
  
  return { facebook,
    instagram ,youtube};
  
}
@UseGuards(JwtAuthGuard)
@Delete('social/:provider')
async disconnect(@Req() req, @Param('provider') provider: string) {
  const userId = req.user.id;
  await this.logoutService.disconnectProvider(userId, provider);
  return { message: `${provider} disconnected successfully` };
}
}
