import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh-token') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // or from cookie
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const authHeader = req.get('Authorization');
    if (!authHeader) return null;

    const refreshToken = authHeader.replace('Bearer', '').trim();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { refreshTokens: true },
    });
    if (!user) return null;

    const token = user.refreshTokens.find(t => t.token === refreshToken);
    if (!token || token.revoked) return null;

    return user;
  }
}
