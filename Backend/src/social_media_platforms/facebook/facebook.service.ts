import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
// No FormData or AxiosRequestConfig needed for this flow

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

interface FacebookPostResponse {
  id: string;
  post_id?: string;
}

@Injectable()
export class FacebookService {
  private readonly FACEBOOK_GRAPH_API_URL = 'https://graph.facebook.com/v19.0';
  // We don't need the 'graph-video' URL for this method
  private readonly FACEBOOK_GRAPH_VIDEO_API_URL ='https://graph-video.facebook.com/v19.0';
  /**
   * NEW: Helper function to get all pages for the frontend dropdown
   * 
   */
  constructor(private readonly prisma: PrismaService) {}
 private async getFacebookToken(userId: number): Promise<string> {
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
            access_token: accessToken },
        },
      );
      // Return a clean list of pages
      return (pagesResponse.data.data as FacebookPage[]).map((page) => ({
        id: page.id,
        name: page.name,
        pictureUrl: page.picture?.data?.url || null,
      }));
    } catch (error) {
      console.error('Error fetching Facebook pages:', error.response?.data);
      throw new InternalServerErrorException('Failed to fetch Facebook pages.');
    }
  }

  /**
   * UPDATED: Main function, now takes pageId, mediaUrl, and mediaType
   */
  async postToFacebook(
    userId: number,
    pageId: string,
    content: string,
    mediaUrl: string,
    mediaType: 'IMAGE' | 'VIDEO' | 'STORY'|'REEL',
  ) {
    const userAccessToken = await this.getFacebookToken(userId);
    if (!userAccessToken) {
      throw new BadRequestException('Facebook access token not found.');
    }

    try {
      // Step 1: Get all pages to find the access token for the selected page
      const pagesResponse = await axios.get(
        `${this.FACEBOOK_GRAPH_API_URL}/me/accounts`,
        {
          params: { 
            access_token: userAccessToken
           },
        },
      );

      const pages = (pagesResponse.data as { data: FacebookPage[] }).data;
      if (!pages || pages.length === 0) {
        throw new BadRequestException('No manageable Facebook pages found.');
      }

      // Step 2: Find the specific page the user selected
      const selectedPage = pages.find((p) => p.id === pageId);
      if (!selectedPage) {
        throw new BadRequestException(
          'Page not found or user does not have permission for this page.',
        );
      }

      const pageAccessToken = selectedPage.access_token;

      // Step 3: Determine post type and call the appropriate function
      if (mediaType === 'IMAGE') {
        return this.postPhoto(pageId, pageAccessToken, content, mediaUrl);
      } else if (mediaType === 'VIDEO') {
        return this.postRegularVideo(pageId, pageAccessToken, content, mediaUrl);
      }else if (mediaType === 'REEL') {
        return this.postFacebookReel(pageId, pageAccessToken, content , mediaUrl);
      }
      else if (mediaType === 'STORY') {
        const isVideo = ['.mp4', '.mov', '.avi'].some(ext => mediaUrl.toLowerCase().endsWith(ext));
        if (isVideo) {
          return this.postVideoStory(pageId, pageAccessToken, mediaUrl);
        }
        else{
          return this.postPhotoStory(pageId, pageAccessToken, mediaUrl);
        }
      }
      else {
        throw new BadRequestException('Unsupported media type.');
      }
    } catch (error) {
      const errorData = error.response?.data;
      console.error(
        'Error posting to Facebook:',
        errorData?.error || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.error?.message || 'Failed to post to Facebook.',
      );
    }
  }

  /**
   * UPDATED: postPhoto now uses the 'url' parameter
   */
  private async postPhoto(
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

  /**
   * UPDATED: postRegularVideo now uses 'file_url' and is much simpler
   * This replaces the entire resumable upload (start, transfer, finish) flow
   */
  private async postRegularVideo(
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

  // We can remove the old postReel and resumable postRegularVideo methods
  // as they are no longer used in this flow.

private async postPhotoStory(
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
  catch(error){
    console.error('Error posting photo story:', error.response?.data);
    throw new InternalServerErrorException(error.response?.data?.error?.message || 'Failed to post photo story.');
  }
    }
private async postVideoStory(
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
      `https://graph.facebook.com/v24.0/${pageId}/video_stories`,
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
      `https://graph.facebook.com/v24.0/${pageId}/video_stories`,
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
  } catch (error) {
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
    `https://graph.facebook.com/v24.0/${videoId}`,
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

private async postFacebookReel(
  pageId: string,
  pageAccessToken: string,
  content: string,
  mediaUrl: string,
) {
  try {
    // PHASE 1: Initialize
    const initResponse = await axios.post(
      `https://graph.facebook.com/v24.0/${pageId}/video_reels`,
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
      `https://graph.facebook.com/v24.0/${pageId}/video_reels`,
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
  } catch (error) {
    console.error('Reel Upload Error:', error.response?.data || error.message);
    throw new InternalServerErrorException('Failed to publish Facebook Reel.');
  }
}
}