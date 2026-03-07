import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {FacebookPage} from './facebook.interface';
@Injectable()
export class FacebookAuthService {
  private readonly FACEBOOK_GRAPH_API_URL: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.FACEBOOK_GRAPH_API_URL = this.configService.get<string>('FACEBOOK_GRAPH_API_URL')!;
  }

  async getFacebookToken(userId: number): Promise<string> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        userId: userId,
        provider: 'facebook',
      },
    });

    if (!account || !account.accessToken) {
      throw new BadRequestException(
        'Facebook account not connected or token missing. Please connect your Facebook account.',
      );
    }

    return account.accessToken;
  }

  async getPages(userId: number) {
    const accessToken = await this.getFacebookToken(userId);
    try {
      const pagesResponse = await axios.get(
        `${this.FACEBOOK_GRAPH_API_URL}/me/accounts`,
        {
          params: {
            fields: 'id,name,picture,access_token',
            access_token: accessToken,
          },
        },
      );
      
      return (pagesResponse.data.data as FacebookPage[]).map((page) => ({
        id: page.id,
        name: page.name,
        pictureUrl: page.picture?.data?.url || null,
      }));
    } catch (error: any) {
      console.error('Error fetching Facebook pages:', error.response?.data);
      throw new InternalServerErrorException('Failed to fetch Facebook pages.');
    }
  }

  async getPageToken(userAccessToken: string, pageId: string): Promise<string> {
    try {
      const pagesResponse = await axios.get(
        `${this.FACEBOOK_GRAPH_API_URL}/me/accounts`,
        {
          params: { access_token: userAccessToken },
        },
      );

      const pages = (pagesResponse.data as { data: FacebookPage[] }).data;
      if (!pages || pages.length === 0) {
        throw new BadRequestException('No manageable Facebook pages found.');
      }

      const selectedPage = pages.find((p) => p.id === pageId);
      if (!selectedPage) {
        throw new BadRequestException(
          'Page not found or user does not have permission for this page.',
        );
      }

      return selectedPage.access_token;
    } catch (error: any) {
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to authenticate page.',
      );
    }
  }
}