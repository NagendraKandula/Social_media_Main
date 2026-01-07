import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
 
@Injectable()
export class ThreadsStrategy extends PassportStrategy(Strategy, 'threads') {
  constructor(private configService: ConfigService) {
    super({
      authorizationURL: 'https://threads.net/oauth/authorize',
      tokenURL: 'https://graph.threads.net/oauth/access_token',
      clientID: configService.get<string>('THREADS_APP_ID')!,
      clientSecret: configService.get<string>('THREADS_APP_SECRET')!,
      callbackURL: configService.get<string>('THREADS_REDIRECT_URI')!,
      scope: ['threads_basic', 'threads_content_publish'],
      state: false, // 👈 KEY CHANGE: Disable auto-state so we can handle it manually
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    // Basic profile extraction
    const { id, username, threads_profile_picture_url } = profile || {};
    const user = {
      threadsId: id?? null,
      username: username ?? null,
      profilePic: threads_profile_picture_url??null,
      accessToken, // This is the SHORT-LIVED token
    };
    done(null, user);
  }

  // Helper to fetch profile since Passport-OAuth2 doesn't do it automatically for Threads
  async userProfile(accessToken: string, done: Function) {
    try {
      // Simple fetch to get user details
      const response = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
      );
      const data = await response.json();
      done(null, data);
    } catch (error) {
      done(error, null);
    }
  }
}