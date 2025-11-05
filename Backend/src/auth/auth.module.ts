// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy'; // <-- Import GoogleStrategy
import { YoutubeStrategy } from './youtube.strategy';
import { FacebookStrategy } from './facebook.strategy';// <-- Import YoutubeStrategy
import { LinkedinStrategy } from './linkedin.strategy';
import { HttpModule } from '@nestjs/axios';
import { JwtRefreshTokenStrategy } from './jwt-refresh.strategy';
// <-- Import ThreadsStrategy                                                 

@Module({
  imports: [
    PrismaModule,
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
  controllers: [AuthController, LinkedinStrategy],
  providers: [AuthService, JwtStrategy, GoogleStrategy,YoutubeStrategy,FacebookStrategy,JwtRefreshTokenStrategy,], // <-- Add GoogleStrategy
  exports: [AuthService, JwtModule], 
})
export class AuthModule {}