import { Injectable,Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from "rxjs";

@Injectable()
export class InstagramStrategy extends PassportStrategy(Strategy, 'instagram') {
    private readonly logger = new Logger(InstagramStrategy.name);
    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        super({
            authorizationURL:'https://www.instagram.com/oauth/authorize',
              tokenURL: 'https://api.instagram.com/oauth/access_token',
              clientID: configService.get<string>('INSTAGRAM_APP_ID')!,
               clientSecret: configService.get<string>('INSTAGRAM_APP_SECRET')!,
               callbackURL: configService.get<string>('INSTAGRAM_REDIRECT_URL')!,
                scope: [
        'instagram_business_basic',
        'instagram_business_manage_messages',
        'instagram_business_manage_comments',
        'instagram_business_content_publish',
      ],
      state: false, // We'll handle state manually
        });
    }

 async userProfile(accessToken: string,done: Function) {
    try{
       const url = `https://graph.instagram.com/v24.0/me?fields=user_id,username,account_type,profile_picture_url&access_token=${accessToken}`;
       const response = await firstValueFrom(this.httpService.get(url));
       const profile = {
        provider : 'instagram',
        id: response.data.user_id,
        username: response.data.username,
        profilePic: response.data.profile_picture_url || null,
        _raw: response.data,
       }
       done(null,profile);
    }
    catch(error){
        //this.logger.error('Error fetching Instagram user profile', error.message);
        done(error,null);
    }
}
    async validate(accessToken: string, refreshToken: string, profile: any, done: Function): Promise<any> {
    const instagramUser = {
      instagramId: profile.id,
      username: profile.username,
      profilePic: profile.profilePic,
      accessToken, // This is the SHORT-LIVED token (1 hour)
      refreshToken,
    };
    done(null, instagramUser);
  }
 }