import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config'; 
import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
     private config: ConfigService,
  ) {}
  async getTokens(userId: number, email: string) {
      const payload = { sub: userId, email };
      const accessToken = this.jwtService.sign(payload,{
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      });
      const refreshToken = this.jwtService.sign(payload,{
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      });
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      await this.prisma.refreshToken.create({
        data: {
          userId,
          token: refreshToken,
          expiresAt,
        },
      });
      return { accessToken, refreshToken };
    }
      
    public async signToken(userId: number, email: string): Promise<string> {
      const payload = { sub: userId, email };
      return this.jwtService.signAsync(payload, { expiresIn: '60m' });
    }
  
    async refreshTokens(userId: number, refreshToken: string) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { refreshTokens: true },
        });
        if(!user) {
          throw new BadRequestException('User not found');
        }
        const token = user.refreshTokens.find(
          (token) => token.token === refreshToken,
        );  
        if(!token || token.revoked){
          throw new BadRequestException('Invalid refresh token');
        }
        if(token.expiresAt < new Date()){
          throw new BadRequestException('Refresh token expired');
        }
        const payload = { sub: user.id, email: user.email };
        const newAccessToken = this.jwtService.sign(payload,{
          secret: this.config.get<string>('JWT_SECRET'),
          expiresIn: '15m',
        });
        return { accessToken: newAccessToken };
      }
  
}