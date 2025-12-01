// Backend/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// Helper function to extract the JWT from the cookie
const cookieExtractor = (req: Request): string | null => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['access_token'];
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      // Use our new cookieExtractor function
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET')!,
    });
  }
  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}