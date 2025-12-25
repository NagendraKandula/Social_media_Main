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
  async getYoutubeProfile(userId: number) {
    const account = await this.prisma.socialAccount.findFirst({
        where: {
            userId: userId,
            provider: 'youtube',
        },
    });
    if (!account || !account.accessToken) {
        return null;
    }
    try{
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet',
          mine: true,
          access_token: account.accessToken,
        },
      });
      const channels = response.data.items?.[0];
      if(!channels){
        throw new Error('No YouTube channel found for this user.');
      }
      return {
        providerId: channels.id,
        name: channels.snippet.title,
        profilePic: channels.snippet.thumbnails?.default?.url || null,
        connected: true,
      };
    }
      catch(error){
        console.error('Error fetching YouTube profile:', error.response?.data || error.message);
        return{
        providerId: account.providerId,
        name: 'YouTube Channel',
        connected: false,
        needsReconnect: true,
        }
      }
    }
async getThreadsProfile(userId: number) {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        userId: userId,
        provider: 'threads',
      },
    });

    if (!account || !account.accessToken) {
      return null;
    }

    try {
      // Fetch Threads profile (id, username, and profile picture)
      const response = await axios.get('https://graph.threads.net/v1.0/me', {
        params: {
          fields: 'id,username,threads_profile_picture_url',
          access_token: account.accessToken,
        },
      });

      return {
        providerId: response.data.id,
        name: response.data.username,
        // Threads API returns 'threads_profile_picture_url'
        profilePic: response.data.threads_profile_picture_url || null, 
        connected: true,
      };
    } catch (error) {
      console.error('Error fetching Threads profile:', error.response?.data || error.message);
      return {
        providerId: account.providerId,
        name: 'Threads User',
        connected: false,
        needsReconnect: true,
      };
    }
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



        
    