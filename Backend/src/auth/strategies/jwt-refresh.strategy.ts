import { Injectable,UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { PrismaService } from "src/prisma/prisma.service";
import { refreshTokenExtractor } from "../utils/cookie.extractor";

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh-token') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    
  ) {
    super({
      jwtFromRequest: refreshTokenExtractor, // or from cookie
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    });
  }
 validate(req: Request, payload: any) {
    // Only return the payload. The Guard/Controller will handle DB checks.
    return { id: payload.sub, email: payload.email };
  }
 
}
