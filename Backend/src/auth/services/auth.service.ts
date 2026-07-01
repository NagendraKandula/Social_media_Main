import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { TokenService } from './token.service';
import {randomInt} from 'crypto';
import {getPasswordResetEmail} from '../templates/password-reset.template';
import { Resend } from 'resend';
@Injectable()
export class AuthService {
   private resend: Resend;
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private tokenService: TokenService,
  ) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  // REGISTER
  async register(dto: RegisterDto, res: Response) {
    const { fullName, email, password, confirmPassword } = dto;
    const lowerCaseEmail = email.toLowerCase();
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email:lowerCaseEmail } });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        fullName,
        email: lowerCaseEmail,
        password: hashedPassword,
      },
    });
    return { message: 'Account created successfully' };
  }
  // LOGIN
  async login(dto: LoginDto, res: Response) {
    const { email, password } = dto;
    const lowerCaseEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email:lowerCaseEmail } });
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Invalid credentials');
    }
    const tokens = await this.tokenService.getTokens(user.id, user.email);
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true, // Set to true in production (requires HTTPS)
      sameSite: 'none', // 1 hour
       path: '/',
       maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token',tokens.refreshToken,{
      httpOnly: true,
      secure: true, // Set to true in production (requires HTTPS)
      sameSite: 'none',
       path: '/',
      maxAge:7*24 * 60 * 60 * 1000,
    }
    );
    return { message: 'Login successful'};
  }

  async logout(userId: number, res: Response) {
  // 1️⃣ Revoke refresh tokens in DB
  await this.prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });

  // 2️⃣ Clear cookies
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });

  return { message: 'Logged out successfully' };
}
  // FORGOT PASSWORD or RESEND OTP
  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;
    const lowerCaseEmail = email.toLowerCase();
    const now = new Date();
    const WINDOW_DURATION = 15 * 60 * 1000; // 15 minutes
    const COOLDOWN_DURATION = 60 * 1000; 

    const user = await this.prisma.user.findUnique({ where: { email:lowerCaseEmail } });
    if (!user) {
      return { message: 'If an account exists, an OTP has been sent.' };
    }

    let currentWindowStart = user.otpRequestWindowStart;
    let currentCount = user.otpRequestCount;

    // FIX: Removed the stray this.prisma.user.update block that was here and calling undefined 'otp' variables

    if (user.lastOtpSentAt && now.getTime() - user.lastOtpSentAt.getTime() < COOLDOWN_DURATION) {
      throw new ForbiddenException('Please wait 60 seconds before requesting a new OTP.');
    }

    if (!currentWindowStart || now.getTime() - currentWindowStart.getTime() > WINDOW_DURATION) {
      currentWindowStart = now;
      currentCount = 1;
    } else {
      if (currentCount >= 3) {
        throw new ForbiddenException('Maximum limit reached. Please try again in 15 minutes.');
      }
      currentCount += 1;
    }

    const secureOtp = randomInt(100000, 1000000).toString(); 
    const hashedOtp = await bcrypt.hash(secureOtp, 10);
    const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: hashedOtp,
        otpExpiry,
        otpRequestCount: currentCount,
        otpRequestWindowStart: currentWindowStart,
        lastOtpSentAt: now,
      },
    });

    this.dispatchEmailSafely(lowerCaseEmail, secureOtp);

    return { message: 'If an account exists, an OTP has been sent.' };
  }
private async dispatchEmailSafely(email: string, otp: string) {
    try {
      const verifiedSender = this.config.get<string>('EMAIL_FROM_ADDRESS') || 'noreply@yourdomain.com';
      await this.resend.emails.send({
        from: `Social App <${verifiedSender}>`,
        to: email,
        subject: 'Reset Your Password - Verification Token',
        html: getPasswordResetEmail(otp),
      });
    } catch (error) {
      console.error('[Resend Error] Failed to send email to:', email, error);
    }
  }

  // RESET PASSWORD
  async resetPassword(dto: ResetPasswordDto) {
    const lowerCaseEmail = dto.email.toLowerCase();
    
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({ where: { email: lowerCaseEmail } });
    
    if (!user || !user.otpHash || !user.otpExpiry) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (user.otpExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const isValid = await bcrypt.compare(dto.otp, user.otpHash);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otpHash: null,
        otpExpiry: null,
        otpRequestCount: 0,
        otpRequestWindowStart: null,
        lastOtpSentAt: null,
      },
    });

    return { message: 'Password reset successful' };
  }
    
  
  

  // RESEND OTP
  async resendOtp(dto: ForgotPasswordDto) {
    return this.forgotPassword(dto);
  }
  // LOGOUT
  
}
