// Backend/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {  Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { accessTokenExtractor } from '../utils/cookie.extractor';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      // Use our new cookieExtractor function
      jwtFromRequest: accessTokenExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET')!,
    });
  }
  async validate(payload: any) {
    return { id:  payload.id ||payload.sub, email: payload.email
     };
  }
}