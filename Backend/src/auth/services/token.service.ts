// Backend/src/auth/services/token.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // Standardized payload: strictly 'sub' for userId per JWT standards
  private generatePayload(userId: number, email: string) {
    return { sub: userId, email };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async getTokens(userId: number, email: string) {
    const payload = this.generatePayload(userId, email);
    
    const [at, rt] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    // Store HASHED token in DB
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: this.hashToken(rt),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken: at, refreshToken: rt };
  }

  async rotateTokens(userId: number, email: string, oldRt: string) {
    const hashedOldRt = this.hashToken(oldRt);

    // Atomic check and revoke
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { token: hashedOldRt, userId, revoked: false },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      // Security: If a revoked token is used, potentially revoke ALL user sessions
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Invalid or reused refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    return this.getTokens(userId, email);
  }
}