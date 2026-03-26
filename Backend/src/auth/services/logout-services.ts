import { Injectable,BadRequestException,InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import axios from "axios";
@Injectable()
export class LogoutService {
  constructor(private readonly prisma: PrismaService) {}
  private async getProfileFromDB(userId: number, provider: string,defaultName: string) {
     const account = await this.prisma.socialAccount.findFirst({
        where: {
            userId: userId,
            provider: provider,
        },
    });
    if(!account){
        return null;
    }
    const isExpired = account.expiresAt ? new Date() > account.expiresAt : false;
    return {
      providerId: account.providerId,
        // Use stored name -> fallback to username -> fallback to default
        name: account.platformName || account.platformUsername || defaultName,
        username: account.platformUsername,
        profilePic: account.profilePic || null,
        connected: true,
        needsReconnect: isExpired,
    };
  }
  async disconnectProvider(userId: number, provider: string) {
    return this.prisma.socialAccount.deleteMany({
      where: {
        userId: userId,
        provider: provider,
      },
    });
  }
  async getFacebookProfile(userId: number) {
    return this.getProfileFromDB(userId,'facebook','Facebook User');
  }
  async getInstagramProfile(userId: number) {
    return this.getProfileFromDB(userId,'instagram','Instagram User');
  }
  async getYoutubeProfile(userId: number) {
    return this.getProfileFromDB(userId,'youtube','YouTube User');
    }
async getThreadsProfile(userId: number) {
    return this.getProfileFromDB(userId,'threads','Threads User');
  }

  async getLinkedinProfile(userId: number) {
    return this.getProfileFromDB(userId,'linkedin','LinkedIn User');
  }
  
  async getTwitterProfile(userId: number) {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        userId: userId,
        provider: 'twitter',
      },
    });

    if (!account || !account.accessToken) {
      return null;
    }

    try {
      // Fetch Twitter User Data (Me endpoint)
      const response = await axios.get('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { 'user.fields': 'profile_image_url,name,username' }
      });

      const data = response.data.data;

      // Optional: Update the providerId in DB to the real Twitter ID now that we have it
      if (account.providerId.includes('twitter_account')) {
          await this.prisma.socialAccount.update({
              where: { id: account.id },
              data: { providerId: data.id }
          });
      }

      return {
        providerId: data.id,
        name: data.name || data.username, // Display Name
        username: data.username, // Handle (@username)
        profilePic: data.profile_image_url || null,
        connected: true,
      };
    } catch (error) {
      console.error('Error fetching Twitter profile:', error.response?.data || error.message);
      
      // If 401, token might be expired
      const needsReconnect = error.response?.status === 401;

      return {
        providerId: account.providerId,
        name: 'X (Twitter) User',
        connected: !needsReconnect,
        needsReconnect: true,
      };
    }
  }



  }



        
    