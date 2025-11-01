import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

const GRAPH_API_URL = 'https://graph.threads.net/v1.0';

@Injectable()
export class ThreadsService {
  private readonly THREADS_APP_ID: string;
  private readonly THREADS_APP_SECRET: string;
  private readonly THREADS_REDIRECT_URL: string;
  private readonly THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token';

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.THREADS_APP_ID = this.config.get<string>('THREADS_APP_ID')!;
    this.THREADS_APP_SECRET = this.config.get<string>('THREADS_APP_SECRET')!;
    this.THREADS_REDIRECT_URL = this.config.get<string>('THREADS_REDIRECT_URL')!;
  }

  // ✅ Step 1: Exchange code for access token
  async exchangeCodeForTokens(code: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.THREADS_TOKEN_URL, null, {
          params: {
            client_id: this.THREADS_APP_ID,
            client_secret: this.THREADS_APP_SECRET,
            redirect_uri: this.THREADS_REDIRECT_URL,
            code,
          },
        }),
      );
      return response.data; // contains { access_token, user_id }
    } catch (err: any) {
      console.error('Threads Token Exchange Error:', err.response?.data || err.message);
      throw new InternalServerErrorException(
        `Failed to exchange code: ${err.response?.data?.error?.message || err.message}`,
      );
    }
  }

  // ✅ Step 2: Post to Threads (no change here)
  async postToThreads(accessToken: string, content: string, mediaUrl?: string) {
    // your existing postToThreads logic here (unchanged)
  }
}
