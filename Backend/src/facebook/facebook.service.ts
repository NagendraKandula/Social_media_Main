import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';
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

  /**
   * NEW: Helper function to get all pages for the frontend dropdown
   */
  async getPages(accessToken: string) {
    try {
      const pagesResponse = await axios.get(
        `${this.FACEBOOK_GRAPH_API_URL}/me/accounts`,
        {
          params: { 
            fields: 'id,name,picture',
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
    userAccessToken: string,
    pageId: string,
    content: string,
    mediaUrl: string,
    mediaType: 'IMAGE' | 'VIDEO',
  ) {
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
      } else {
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
}