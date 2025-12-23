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
  async refreshTokens(@Request() req, @Res({ passthrough: true }) res: Response) {
    const userId = req.user.id;
    const refreshToken = req
    .get('Authorization')
    .replace('Bearer', '')
    .trim();
    const {accessToken } = await this.tokenService.refreshTokens(userId, refreshToken);
    res.cookie('access_token', accessToken, {
      httpOnly: true, 
      secure: this.configService.get('NODE_ENV') !== 'development', 
      sameSite:'none',
    });
    return res.send({accessToken});
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
  
  // Use the new service to get the profile
  const [facebook,instagram] = await Promise.all([
    this.logoutService.getFacebookProfile(userId),
    this.logoutService.getInstagramProfile(userId),
  ]);
  
  return { facebook,
    instagram };
  
}
@UseGuards(JwtAuthGuard)
@Delete('social/:provider')
async disconnect(@Req() req, @Param('provider') provider: string) {
  const userId = req.user.id;
  await this.logoutService.disconnectProvider(userId, provider);
  return { message: `${provider} disconnected successfully` };
}
}
