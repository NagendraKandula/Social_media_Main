import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwtService: JwtService,
  ) {}

    
  private async signToken(userId: number, email: string): Promise<string> {
    const payload = { sub: userId, email };
    return this.jwtService.signAsync(payload, { expiresIn: '60m' });
  }

  async googleLogin(req, res: Response) {
    if (!req.user) {
      throw new BadRequestException('No user from google');
    }

    const { email, firstName, lastName } = req.user;
    const lowerCaseEmail = email.toLowerCase();
    
    let user = await this.prisma.user.findUnique({ where: { email:lowerCaseEmail } });

    if (!user) {
      const generatedPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(generatedPassword, 12);
      
      user = await this.prisma.user.create({
        data: {
          email: lowerCaseEmail,
          fullName: `${firstName} ${lastName}`,
          password: hashedPassword,
        },
      });
    }
    
    const token = await this.signToken(user.id, user.email);
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'none',
      expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
     return res.redirect(`${frontendUrl}/Landing`);
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
    const token = await this.signToken(user.id, user.email);
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: false, // Set to true in production (requires HTTPS)
      sameSite: 'none',
      expires: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
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
    const token = await this.signToken(user.id, user.email);
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: false, // Set to true in production (requires HTTPS)
      sameSite: 'none',
      expires: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
    });
    return { message: 'Login successful'};
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
  async Logout(res : Response){
    res.clearCookie('access_token' , { path: '/' });
    return {message : 'Logged out sucessfully'}
  }

 async facebookLogin(req, res: Response) {
    if (!req.user) {
      throw new BadRequestException('No user from facebook');
    }

    const { accessToken, refreshToken } = req.user;

    res.cookie('facebook_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'none',
    });

    if (refreshToken) {
      res.cookie('facebook_refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'none',
      });
    }
     const frontendUrl = this.config.get<string>('FRONTEND_URL');
     return res.redirect(`${frontendUrl}/Landing`);
  }

 



}
