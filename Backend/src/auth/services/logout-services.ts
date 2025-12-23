import { Injectable,BadRequestException,InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import axios from "axios";
@Injectable()
export class LogoutService {
  constructor(private readonly prisma: PrismaService) {}
  async getFacebookProfile(userId: number) {
    const account = await this.prisma.socialAccount.findFirst({
        where: {
            userId: userId,
            provider: 'facebook',
        },
    });

    if (!account || !account.accessToken) {
        return null;
    }
    try{
        const response = await axios.get('https://graph.facebook.com/me', {
            params: {
                fields: 'id,name,picture.type(large)',
                access_token: account.accessToken,
            },
        });
        return {
            providerId: response.data.id,
            name: response.data.name,
            profilePic: response.data.picture?.data?.url || null,
            connected: true,
        };
    }
    catch (error) {
        
        console.error('Error fetching Facebook profile:', error.response?.data || error.message);
      return {
        providerId: account.providerId,
        name: 'Facebook User',
        connected: false,
        needsReconnect: true,
      };
     }
  }
  async disconnectProvider(userId: number, provider: string) {
    return this.prisma.socialAccount.deleteMany({
      where: {
        userId: userId,
        provider: provider,
      },
    });
  }
  async getInstagramProfile(userId: number) {
    const account = await this.prisma.socialAccount.findFirst({
        where: {
            userId: userId,
            provider: 'instagram',
        },
    });
    if (!account || !account.accessToken) {
        return null;
    }
    try {
      const response = await axios.get('https://graph.instagram.com/me', {
        params: {
          fields: 'id,username,account_type,profile_picture_url',
          access_token: account.accessToken,
        },
      });
      return {
        providerId: response.data.id,
        name: response.data.username,
        accountType: response.data.account_type,
        profilePic: response.data?.profile_picture_url ||  null ,// Instagram Graph API does not provide profile picture in this endpoint
        connected: true,
      };
    } catch (error) {
      console.error('Error fetching Instagram profile:', error.response?.data || error.message);
      return {
        providerId: account.providerId,
        name: 'Instagram User',
        connected: false,
        needsReconnect: true,
      };

    }
  }


}

        
    