import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-twitter-oauth2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('TWITTER_CLIENT_ID'),
      clientSecret: configService.get<string>('TWITTER_CLIENT_SECRET'),
      callbackURL: configService.get<string>('TWITTER_CALLBACK_URL'),
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      state: false, // 👈 KEY: Disable auto-state to handle it manually
      pkce: false, // We use standard confidential flow to match Threads/LinkedIn pattern
    } as any);
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    const user = {
      twitterId: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}