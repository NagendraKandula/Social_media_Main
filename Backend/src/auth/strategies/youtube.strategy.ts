// Backend/src/auth/youtube.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-youtube-v3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class YoutubeStrategy extends PassportStrategy(Strategy, 'youtube') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('YOUTUBE_CLIENT_ID'),
      clientSecret: configService.get<string>('YOUTUBE_CLIENT_SECRET'),
      callbackURL:  configService.get<string>('YOUTUBE_CALLBACK_URL'),
      scope: ['https://www.googleapis.com/auth/youtube.readonly',
              'https://www.googleapis.com/auth/youtube.upload',
              'https://www.googleapis.com/auth/yt-analytics.readonly',
             // 'https://www.googleapis.com/auth/yt-analytics.readonly', // Add this scope
             'https://www.googleapis.com/auth/yt-analytics-monetary.readonly', 

      ],
      prompt: 'consent',
      accessType:'offline' // Request read-only access
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    // In this strategy, we are not creating a user or storing tokens in the DB.
    // We are simply validating the user and passing the tokens along.
    const rawSnippet = profile._json?.items?.[0]?.snippet;
    
    const profilePic = 
      rawSnippet?.thumbnails?.high?.url || 
      rawSnippet?.thumbnails?.medium?.url || 
      rawSnippet?.thumbnails?.default?.url || 
      null; // Fallback to null if structure changes
    const youtubeUser = {
      youtubeId: profile.id,
      displayName: profile.displayName,
      profilePic,
      accessToken, // Pass the tokens to the request object
      refreshToken,
    };
    done(null, youtubeUser);
  }
}