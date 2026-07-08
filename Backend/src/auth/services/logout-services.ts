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
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        userId,
        provider: 'instagram',
      },
    });

    if (!account) {
      return null;
    }

    const isExpired = account.expiresAt ? new Date() > account.expiresAt : false;
    let profilePic = account.profilePic || null;
    let username = account.platformUsername || account.platformName;

    if (!isExpired && account.accessToken) {
      try {
        const response = await axios.get('https://graph.instagram.com/v24.0/me', {
          params: {
            fields: 'user_id,username,profile_picture_url',
            access_token: account.accessToken,
          },
        });

        profilePic = response.data.profile_picture_url || profilePic;
        username = response.data.username || username;

        if (profilePic !== account.profilePic || username !== account.platformUsername) {
          await this.prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              profilePic,
              platformUsername: username,
            },
          });
        }
      } catch (error) {
        console.warn(
          'Could not refresh Instagram profile:',
          error.response?.data || error.message,
        );
      }
    }

    return {
      providerId: account.providerId,
      name: account.platformName || username || 'Instagram User',
      username,
      profilePic,
      connected: true,
      needsReconnect: isExpired,
    };
  }
  async getYoutubeProfile(userId: number) {
    return this.getProfileFromDB(userId,'youtube','YouTube User');
    }
async getThreadsProfile(userId: number) {
    return this.getProfileFromDB(userId,'threads','Threads User');
  }

  async getLinkedinProfile(userId: number) {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        userId,
        provider: 'linkedin',
      },
    });

    if (!account) {
      return null;
    }

    const isExpired = account.expiresAt ? new Date() > account.expiresAt : false;
    let profilePic = account.profilePic || null;
    let name = account.platformName || account.platformUsername;

    if (!isExpired && account.accessToken) {
      try {
        const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
          },
        });

        profilePic = response.data.picture || profilePic;
        name = response.data.name || name;

        if (profilePic !== account.profilePic || name !== account.platformName) {
          await this.prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              profilePic,
              platformName: name,
            },
          });
        }
      } catch (error) {
        console.warn(
          'Could not refresh LinkedIn profile:',
          error.response?.data || error.message,
        );
      }
    }

    return {
      providerId: account.providerId,
      name: name || 'LinkedIn User',
      username: account.platformUsername,
      profilePic,
      connected: true,
      needsReconnect: isExpired,
    };
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



