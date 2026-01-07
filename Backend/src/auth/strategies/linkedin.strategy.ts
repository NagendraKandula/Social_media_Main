import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-linkedin-oauth2';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  private readonly logger = new Logger(LinkedInStrategy.name);

  constructor(
    private configService: ConfigService,
    private httpService: HttpService, // ✅ Inject HttpService
  ) {
    super({
      clientID: configService.get<string>('LINKEDIN_CLIENT_ID'),
      clientSecret: configService.get<string>('LINKEDIN_CLIENT_SECRET'),
      callbackURL: configService.get<string>('LINKEDIN_CALLBACK_URL'),
      scope: ['openid', 'profile', 'email', 'w_member_social'], // ✅ OIDC Scopes
      state: false,
    } as any);
  }

  // ✅ OVERRIDE: Fetch profile from OIDC endpoint instead of v2/me
  async userProfile(accessToken: string, done: Function) {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      
      // Pass the OIDC profile data to validate()
      done(null, response.data);
    } catch (error) {
      this.logger.error('Error fetching LinkedIn profile', error.response?.data || error.message);
      done(error, null);
    }
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    // ✅ Map OIDC fields (sub, name, picture, email)
    const user = {
      linkedinId: profile?.sub??null, // 'sub' is the unique ID in OIDC
      name: profile?.name ?? null,
      email: profile?.email ?? null,
      picture: profile?.picture ?? null,
      accessToken,
      refreshToken,
    };
    
    done(null, user);
  }
}