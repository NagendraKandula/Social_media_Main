import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID')!,
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET')!,
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL')!,
      scope: [
        'email',
        'pages_manage_posts',
        'pages_read_engagement',
        'pages_show_list',
        //'instagram_basic',
        //'instagram_content_publish',
      ],
      profileFields: ['id', 'emails', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    if (!profile) {
      throw new Error('No profile returned from Facebook');
    }

    // Safely get email
    const email =
      Array.isArray(profile.emails) && profile.emails.length > 0
        ? profile.emails[0].value
        : `${profile.id}@facebook.com`; // fallback if no email

    // Safely get name
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';

    // Build user object
    const user = {
      facebookId: profile.id,
      email,
      firstName,
      lastName,
      accessToken,
      refreshToken,
    };

    console.log('Full Facebook profile:', profile);
    console.log('User object from FacebookStrategy:', user);

    // Return user object; NestJS handles "done()" internally
    return user;
  }
}
