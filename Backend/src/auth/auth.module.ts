// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy'; // <-- Import GoogleStrategy
import { YoutubeStrategy } from './strategies/youtube.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';// <-- Import YoutubeStrategy
import { LinkedinStrategy } from './strategies/linkedin.strategy';
import { InstagramStrategy } from './strategies/instagram.strategy';
import { HttpModule } from '@nestjs/axios';
import { JwtRefreshTokenStrategy } from './strategies/jwt-refresh.strategy';
import { TokenService } from './services/token.service';
import { SocialAuthService } from './services/social-auth.service';
import { LogoutService } from './services/logout-services';
import { SocialAuthController } from './controllers/social-auth.controller';
// <-- Import ThreadsStrategy                                                 
import { TwitterModule } from '../social_media_platforms/twitter/twitter.module';
@Module({
  imports: [
    PrismaModule,
    TwitterModule,
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, LinkedinStrategy,SocialAuthController],
  providers: [AuthService, JwtStrategy,
     GoogleStrategy,YoutubeStrategy,
     FacebookStrategy,JwtRefreshTokenStrategy,
    TokenService,SocialAuthService,InstagramStrategy,LogoutService], // <-- Add GoogleStrategy
  exports: [AuthService, JwtModule, TokenService, SocialAuthService,LogoutService], 
})
export class AuthModule {}