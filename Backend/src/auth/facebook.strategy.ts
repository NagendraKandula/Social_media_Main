import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID')!,
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET')!,
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL')!,
      scope:['email', 
        'pages_manage_posts', 
        'pages_read_engagement', 
        'pages_show_list',
        'instagram_basic',
        'instagram_content_publish',
        'business_management',
 ]
      ,
      profileFields: ['emails', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    // Safely access potentially undefined properties
    const user = {
      email: profile.emails?.[0]?.value ?? '', // Use optional chaining and fallback to empty string
      firstName: profile.name?.givenName ?? '', // Use optional chaining and fallback
      lastName: profile.name?.familyName ?? '', // Use optional chaining and fallback
      accessToken,
      refreshToken,
    };
    console.log('User object from Facebook:', user);

    done(null, user);
  }
}