import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Response, Request } from 'express';
import { TokenService } from './token.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
// Import LinkedinService
import { LinkedinService } from '../../social_media_platforms/linkedin/linkedin.service';

@Injectable()
export class SocialAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    // Inject LinkedinService
    private readonly linkedinService: LinkedinService,
  ) {}

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
      
      const token = await this.tokenService.getTokens(user.id, user.email);
      res.cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'none',
        expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
      });
  
      const frontendUrl = this.config.get<string>('FRONTEND_URL');
       return res.redirect(`${frontendUrl}/Landing`);
    }

    async facebookLogin(req, res: Response, appUserId: number) {
        if (!req.user || !req.user.id) {
          throw new BadRequestException('No user from facebook');
        }
    
        const { accessToken, refreshToken,id:facebookId } = req.user;
        const providerIdStr = facebookId.toString();

        const existingAccount = await this.prisma.socialAccount.findUnique({
            where: {
            provider_providerId: {
                provider: 'facebook',
                providerId: providerIdStr,
            },
            },
        });

        if (existingAccount) {
            await this.prisma.socialAccount.update({
            where: { id: existingAccount.id },
            data: {
                accessToken,
                refreshToken,
                userId: appUserId,
                updatedAt: new Date(),
                expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            },
            });
        } else {
            await this.prisma.socialAccount.create({
            data: {
                provider: 'facebook',
                providerId: providerIdStr,
                accessToken,
                refreshToken,
                userId: appUserId,
                expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            },
            });
        }
         const frontendUrl = this.config.get<string>('FRONTEND_URL');
         return res.redirect(`${frontendUrl}/facebook-post`);
      }

    async youtubeLogin(req, res: Response,appUserId: number) {
        const { accessToken, refreshToken,youtubeId,displayName } = req.user;
    
        if (!appUserId) {
          throw new BadRequestException('App user not found .please log in first');
        }
        
        const existingYoutube = await this.prisma.socialAccount.findUnique({
          where:{
            provider_providerId:{
              providerId: youtubeId,
              provider: 'youtube',
            },
          },
        });
        if(existingYoutube){
          await this.prisma.socialAccount.update({
            where:{ id: existingYoutube.id },
            data:{
              accessToken,
              refreshToken,
              updatedAt: new Date(),
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
              userId : appUserId, 
            },
          });
        }
        else{
          await this.prisma.socialAccount.create({
            data:{  
              provider: 'youtube',
              providerId: youtubeId,
              accessToken,  
              refreshToken,
              userId: appUserId,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000), 
            },
          });
        }
        
        res.cookie('youtube_access_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development', 
          sameSite: 'none',
        });
    
        res.cookie('youtube_refresh_token', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          sameSite: 'none',
        });
        
        const frontendUrl = this.config.get<string>('FRONTEND_URL');
        return res.redirect(`${frontendUrl}/Landing?youtube=connected`);
    }

    async instagramLogin(req, res: Response, appUserId: number) {
        const { accessToken, instagramId, username } = req.user;

        let longLivedToken = accessToken;
        let expiresSeconds = 3600; 

        try {
            const exchangeUrl = 'https://graph.instagram.com/access_token';
            const response = await firstValueFrom(
                this.httpService.get(exchangeUrl, {
                params: {
                    grant_type: 'ig_exchange_token',
                    client_secret: this.config.get('INSTAGRAM_APP_SECRET'),
                    access_token: accessToken,
                },
                }),
            );
            
            longLivedToken = response.data.access_token;
            expiresSeconds = response.data.expires_in; 
        } catch (error) {
            console.error('⚠️ Failed to exchange long-lived token. Using short-lived token instead.', error.response?.data);
        }

        const existingAccount = await this.prisma.socialAccount.findUnique({
            where: {
                provider_providerId: {
                provider: 'instagram',
                providerId: instagramId.toString(),
            },
            },
        });

        if (existingAccount) {
            await this.prisma.socialAccount.update({
                where: { id: existingAccount.id },
                data: {
                accessToken: longLivedToken,
                userId: appUserId,
                updatedAt: new Date(),
                expiresAt: new Date(Date.now() + expiresSeconds * 1000),
                },
            });
        } else {
            await this.prisma.socialAccount.create({
                data: {
                provider: 'instagram',
                providerId: instagramId.toString(),
                accessToken: longLivedToken,
                userId: appUserId,
                expiresAt: new Date(Date.now() + expiresSeconds * 1000),
                },
            });
        }

        const frontendUrl = this.config.get<string>('FRONTEND_URL');
        return res.redirect(`${frontendUrl}/instagram-business-post?instagram=connected`);
    }

    // ✅ ADDED: LinkedIn Login Logic
    async linkedinLogin(req: Request, res: Response, code: string, state: string) {
        const frontendUrl = this.config.get<string>('FRONTEND_URL');
        try {
            // 1. Decode State to get User ID
            const decodedState = JSON.parse(decodeURIComponent(state));
            const userId = decodedState.userId;

            if (!userId) throw new BadRequestException('User ID missing from state');

            // 2. Exchange Code for Token
            const tokens = await this.linkedinService.exchangeCodeForToken(code);

            // 3. Get Profile Info
            const profile = await this.linkedinService.getUserProfile(tokens.access_token);
            const linkedinId = profile.sub; // 'sub' is the ID for OIDC

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
}