import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { FacebookPostResponse, FacebookAttachedMedia } from './facebook.interface';
@Injectable()
export class FacebookMediaService {
  private readonly FACEBOOK_GRAPH_API_URL: string;

  constructor(private readonly configService: ConfigService) {
    this.FACEBOOK_GRAPH_API_URL = this.configService.get<string>('FACEBOOK_GRAPH_API_URL')!;
  }
     
 async postPhoto(
    pageId: string,
    pageAccessToken: string,
    content: string,
    mediaUrl: string,
  ) {
    const response = await axios.post(
      `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/photos`,
      null, // No form data needed
      {
        params: {
          caption: content,
          url: mediaUrl,
          access_token: pageAccessToken,
        },
      },
    );

    const postData = response.data as FacebookPostResponse;
    return {
      success: true,
      postId: postData.post_id,
      message: 'Photo posted successfully.',
    };
  }
 async postRegularVideo(
    pageId: string,
    pageAccessToken: string,
    content: string,
    mediaUrl: string,
  ) {
    const response = await axios.post(
      `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/videos`,
      null, // No form data needed
      {
        params: {
          description: content,
          file_url: mediaUrl,
          access_token: pageAccessToken,
        },
      },
    );

    const postData = response.data as FacebookPostResponse;
    return {
      success: true,
      postId: postData.id,
      message:
        'Video post submitted successfully. It may take a few moments to process.',
    };
  }
async postPhotoStory(
  pageId: string,
  pageAccessToken: string,
  mediaUrl: string,
){
  try{
    const photoUploadResponse = await axios.post(
      `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/photos`,
      null,
      {
        params: {
          url: mediaUrl,
          published: false,
          access_token: pageAccessToken,
        },
      },
    );
    const photoId = photoUploadResponse.data.id;
    if(!photoId){
      throw new InternalServerErrorException('Failed to get photo ID.');
    }
    const storyResponse = await axios.post(
      `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/photo_stories`,
      {
        photo_id: photoId,
      },
      {
        params: {
          access_token: pageAccessToken,
        },
      },
    );
    return {
      success: true,
      postId : storyResponse.data.id,
      message: 'Photo story posted successfully.',
    };
  }
  catch(error:any){
    console.error('Error posting photo story:', error.response?.data);
    throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to post photo story.');
  }
    }

    async postVideoStory(
  pageId: string,
  pageAccessToken: string,
  mediaUrl: string,
) {
  try {
    //
    // 🔹 STEP 1: START (This is correct)
    //
    console.log('📤 Step 1: Starting video story session...');
    const startResponse = await axios.post(
      `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/video_stories`,
      null,
      {
        params: {
          upload_phase: 'start',
          access_token: pageAccessToken,
        },
      },
    );
    
    const { video_id, upload_url } = startResponse.data;

    if (!video_id || !upload_url) {
      throw new InternalServerErrorException('Failed to start video story upload.');
    }
    console.log('✅ Step 1 Complete: Video ID:', video_id);
    console.log('🌐 Upload URL:', upload_url);

    console.log('📤 Step 2: Uploading video from URL to:', upload_url);
    const uploadResponse = await axios.post(
      upload_url, // Use the special upload URL from Step 1
      null,       // No body
      {
        params: {
          access_token: pageAccessToken, // Token as PARAM
        },
        headers: {
          'file_url': mediaUrl, // File URL as HEADER
        },
      },
    );
    console.log('✅ Step 2 Complete: Upload response:', uploadResponse.data);
    console.log('📤 Step 3: Finishing video story...');
    const finishResponse = await axios.post(
      `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/video_stories`,
      null,
      {
        params: {
          upload_phase: 'finish',
          video_id,
          access_token: pageAccessToken,
        },
      },
    );

    console.log('✅ Step 3 Complete: Story posted!');
    console.log('🆔 Story Post ID:', finishResponse.data.post_id);

    return {
      success: true,
      postId: finishResponse.data.post_id,
      message: 'Video story posted successfully.',
    };
  } catch (error :any) {
    console.error('❌ Error posting video story:', error.response?.data || error.message);
    const errorMsg =
      error.response?.data?.debug_info?.message ||
      error.response?.data?.error?.message ||
      error.message;
    throw new InternalServerErrorException(
      `Failed to post video story: ${errorMsg}`,
    );
  }
}
async checkVideoStatus(videoId: string, pageAccessToken: string) {
  const response = await axios.get(
    `${this.FACEBOOK_GRAPH_API_URL}/${videoId}`,
    {
      params: {
        fields: 'status',
        access_token: pageAccessToken,
      },
    },
  );

  // Status can be: ready, processing, expired, or error
  return response.data.status;
}
 async postMultiplePhotos(
    pageId: string,
    pageAccessToken: string,
    content: string,
    mediaUrls: string[],
  ) {
    try {
     const uploadPromises = mediaUrls.map((url) => {
        return axios.post(
          `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/photos`,
          null,
          {
            params: {
              url: url,
              published: false, // Prevents immediate posting
              access_token: pageAccessToken,
            },
          },
        );
      });
      // 2. Wait for ALL of them to finish in parallel
      const uploadResponses = await Promise.all(uploadPromises);
      // 3. Map the responses into the format Facebook expects.
      // Promise.all preserves the exact order of the original array!
      const attachedMedia: FacebookAttachedMedia[] = uploadResponses.map(
        (response) => ({
          media_fbid: response.data.id,
        })
      );
      // 4. Publish the feed post with all attached photo IDs
      const feedRes = await axios.post(
        `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/feed`,
        {
          message: content,
          attached_media: attachedMedia,
        },
        {
          params: { access_token: pageAccessToken },
        },
      );
      return {
        success: true,
        postId: feedRes.data.id,
        message: `Successfully posted ${mediaUrls.length} photos in parallel!`,
      };
    } catch (error: any) {
      console.error('Error posting multiple photos:', error.response?.data);
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to post multiple photos.',
      );
    }
  }
 async postFacebookReel(
  pageId: string,
  pageAccessToken: string,
  content: string,
  mediaUrl: string,
) {
  try {
    // PHASE 1: Initialize
    const initResponse = await axios.post(
      `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/video_reels`,
      {
        upload_phase: 'start',
        access_token: pageAccessToken,
      }
    );
    const { video_id, upload_url } = initResponse.data;

    // PHASE 2: Upload (Note the use of rupload.facebook.com via the provided upload_url)
    await axios.post(
      upload_url, 
      null,
      {
        headers: {
          'Authorization': `OAuth ${pageAccessToken}`,
          'file_url': mediaUrl, // For hosted files
        },
      }
    );

    // PHASE 3: Publish
    const finishResponse = await axios.post(
      `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/video_reels`,
      null,
      {
        params: {
          access_token: pageAccessToken,
          video_id: video_id,
          upload_phase: 'finish',
          video_state: 'PUBLISHED',
          description: content,
        },
      }
    );
     const status = await this.checkVideoStatus(video_id, pageAccessToken);
    return {
      success: true,
      postId: video_id,
      message: status.video_status === 'ready' 
      ? 'Reel is live!' 
      : 'Reel is being processed and will be live shortly.',
    };
  } catch (error:any) {
    console.error('Reel Upload Error:', error.response?.data || error.message);
    throw new InternalServerErrorException('Failed to publish Facebook Reel.');
  }
}
}