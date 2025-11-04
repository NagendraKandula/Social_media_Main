import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InstagramBusinessService {
  private readonly logger = new Logger(InstagramBusinessService.name);

  constructor(private readonly httpService: HttpService) {}

  // ✅ Step 1: Verify token works
  async verifyToken(accessToken: string) {
    const url = 'https://graph.instagram.com/v24.0/me?fields=id,username&access_token=${accessToken}';

    this.logger.log('🔍 Verifying access token: ${accessToken}');

    const response = await firstValueFrom(this.httpService.get(url));

    this.logger.log('✅ Token verified successfully:', response.data);
    return response.data;
  }

  // ✅ Step 2: Post to Instagram (create + publish)
  async postToInstagram(
    userId: string,
    imageUrl: string,
    caption: string,
    accessToken: string,
  ) {
    // 1️⃣ Create media container
    const createUrl = 'https://graph.instagram.com/v24.0/${userId}/media';
    const createParams = {
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    };

    this.logger.log('🖼 Creating media container for ${userId}');
    const createRes = await firstValueFrom(
      this.httpService.post(createUrl, null, { params: createParams }),
    );
    const creationId = createRes.data.id;
    this.logger.log('✅ Created media container: ${creationId}');

    // 2️⃣ Publish media
    const publishUrl = 'https://graph.instagram.com/v24.0/${userId}/media_publish';
    const publishParams = {
      creation_id: creationId,
      access_token: accessToken,
    };

    this.logger.log('🚀 Publishing media...');
    const publishRes = await firstValueFrom(
      this.httpService.post(publishUrl, null, { params: publishParams }),
    );

    this.logger.log('✅ Post published successfully:', publishRes.data);
    return publishRes.data;
  }
}