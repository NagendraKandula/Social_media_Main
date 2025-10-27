import { Strategy, StrategyOptions } from 'passport-oauth2';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ThreadsStrategy extends PassportStrategy(Strategy, 'threads') {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const options: StrategyOptions = {
     authorizationURL: 'https://www.threads.com/oauth/authorize',
      tokenURL: 'https://graph.threads.net/v1.0/oauth/access_token',
      clientID: configService.get<string>('THREADS_APP_ID')!,
      clientSecret: configService.get<string>('THREADS_APP_SECRET')!,
      callbackURL: configService.get<string>('THREADS_REDIRECT_URL')!,
      scope: ['threads_basic', 'threads_content_publish'],
    };
    console.log('🪄 THREADS STRATEGY CONFIG:', options); 
    super(options);
  }

  async validate(accessToken: string, refreshToken: string): Promise<any> {
    try {
      const url = `https://graph.threads.net/v1.0/me?fields=id,username`;
      const response = await firstValueFrom(
        this.httpService.get(url, { params: { access_token: accessToken } }),
      );
      const userProfile = response.data;
      return {
        provider: 'threads',
        id: userProfile.id,
        username: userProfile.username,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('Failed to fetch Threads profile:', error);
      throw new Error('Failed to validate Threads user');
    }
  }
}
