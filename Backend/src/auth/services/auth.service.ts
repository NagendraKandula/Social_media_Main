import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { TokenService } from './token.service';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private tokenService: TokenService,
  ) {}

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
       maxAge: 3 * 60 * 1000,
    });
    res.cookie('refresh_token',tokens.refreshToken,{
      httpOnly: true,
      secure: true, // Set to true in production (requires HTTPS)
      sameSite: 'none',
       path: '/',
      maxAge:5* 60 * 1000,
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

    const user = await this.prisma.user.findUnique({ where: { email:lowerCaseEmail } });
    if (!user) {
      throw new BadRequestException('Email not registered');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await this.prisma.user.update({
      where: { email: lowerCaseEmail }, // Corrected line
      data: { otp, otpExpiry },
    });

    // Nodemailer setup using env variables
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get<string>('EMAIL_USER'),
        pass: this.config.get<string>('EMAIL_PASS'),
      },
    });

    await transporter.sendMail({
      from: `"My App" <${this.config.get<string>('EMAIL_USER')}>`,
      to: email,
      subject: 'OTP for Password Reset',
      text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
    });

    return { message: 'OTP sent to email' };
  }

  // RESET PASSWORD
  async resetPassword(dto: ResetPasswordDto) {
    const { email, otp, newPassword, confirmPassword } = dto;
    const lowerCaseEmail = email.toLowerCase();
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({ where: { email:lowerCaseEmail } });
    if (!user || user.otp !== otp) {
      throw new BadRequestException('Invalid email or OTP');
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { email: lowerCaseEmail }, // Corrected line
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiry: null,
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
