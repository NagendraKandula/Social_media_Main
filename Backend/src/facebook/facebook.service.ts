import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios'; // Import AxiosRequestConfig
import { AxiosRequestConfig } from 'axios';
import * as FormData from 'form-data';

// --- Define Interfaces for API response types ---
interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

interface FacebookPostResponse {
  id: string;
  post_id?: string;
}

// --- NEW Interfaces for specific video/reel flows ---
interface VideoInitResponse {
  video_id: string;
  upload_session_id: string;
}

interface VideoFinishResponse {
  success: boolean;
}

interface ReelInitResponse {
  video_id: string;
  upload_url: string;
}

interface ReelStatusResponse {
  status: {
    status_code: string;
    status: string;
  };
}

interface ReelPublishResponse {
  id: string;
  success?: boolean; // Sometimes 'success' is also present
}

@Injectable()
export class FacebookService {
  private readonly FACEBOOK_GRAPH_API_URL = 'https://graph.facebook.com/v19.0';
  private readonly FACEBOOK_GRAPH_VIDEO_API_URL = 'https://graph-video.facebook.com/v19.0';

  async postToFacebook(
    accessToken: string,
    content: string,
    file: Express.Multer.File,
    duration?: number,
    width?: number,
    height?: number,
  ) {
    if (!accessToken) {
      throw new BadRequestException('Facebook access token not found.');
    }
    if (!file) {
      throw new BadRequestException('A media file (photo or video) is required.');
    }

    try {
      // Step 1: Get pages (existing logic)
      console.log('Access Token:', accessToken);
      const pagesResponse = await axios.get(
        `${this.FACEBOOK_GRAPH_API_URL}/me/accounts`,
        {
          params: { access_token: accessToken },
        },
      );
      console.log('Pages Response:', pagesResponse.data);

      const pages = (pagesResponse.data as { data: FacebookPage[] }).data;
      if (!pages || pages.length === 0) {
        throw new BadRequestException('No manageable Facebook pages found for this user.');
      }
      
      const page = pages[0];
      const pageAccessToken = page.access_token;
      const pageId = page.id;

      // Step 2: Determine post type
      if (file.mimetype.startsWith('image/')) {
        return this.postPhoto(pageId, pageAccessToken, content, file);
      
      } else if (file.mimetype.startsWith('video/')) {
        if (duration && width && height) {
          const aspectRatio = width / height;
          const is916 = Math.abs(aspectRatio - (9 / 16)) < 0.05;

          if (is916 && duration <= 90) {
            console.log('Attempting to post as Reel...');
            return this.postReel(pageId, pageAccessToken, content, file);
          }
        }
        
        console.log('Attempting to post as Regular Video...');
        return this.postRegularVideo(pageId, pageAccessToken, content, file);

      } else {
        throw new BadRequestException('Unsupported file type. Please upload an image or video.');
      }
    } catch (error) {
      const errorData = error.response?.data;
      console.error(
        'Error posting to Facebook:', 
        errorData?.error || error.message,
        JSON.stringify(errorData)
      );
      throw new BadRequestException(error.response?.data?.error?.message || 'Failed to post to Facebook.');
    }
  }

  private async postPhoto(
    pageId: string,
    pageAccessToken: string,
    content: string,
    file: Express.Multer.File,
  ) {
    const form = new FormData();
    form.append('caption', content);
    form.append('source', file.buffer, file.originalname);
    form.append('access_token', pageAccessToken);

    const response = await axios.post(
      `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/photos`,
      form,
      { headers: form.getHeaders() },
    );

    const postData = response.data as FacebookPostResponse;
    return { success: true, postId: postData.post_id, message: "Photo posted successfully." };
  }

  private async postRegularVideo(
    pageId: string,
    pageAccessToken: string,
    content: string,
    file: Express.Multer.File,
  ) {
    try {
      const initUrl = `${this.FACEBOOK_GRAPH_VIDEO_API_URL}/${pageId}/videos`;
      
      // --- Step 1: Initialize Upload ---
      console.log('Initializing regular video upload...');
      const initResponse = await axios.post(
        initUrl,
        null,
        {
          params: {
            upload_phase: 'start',
            access_token: pageAccessToken,
            file_size: file.size,
          },
        },
      );
      
      // --- FIX: Use type assertion ---
      const { video_id, upload_session_id } = initResponse.data as VideoInitResponse;
      console.log(`Initialized. Video ID: ${video_id}, Session ID: ${upload_session_id}`);

      // --- Step 2: Transfer Video Data ---
      console.log('Transferring video data...');
      const transferForm = new FormData();
      transferForm.append('upload_phase', 'transfer');
      transferForm.append('access_token', pageAccessToken);
      transferForm.append('upload_session_id', upload_session_id);
      transferForm.append('start_offset', '0');
      transferForm.append('video_file_chunk', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      // --- FIX: Correct AxiosRequestConfig ---
      // Move maxContentLength & maxBodyLength to the root of the config object
      const transferConfig: AxiosRequestConfig = {
        headers: transferForm.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      };

      await axios.post(initUrl, transferForm, transferConfig);
      console.log('Video data transferred.');

      // --- Step 3: Finish Upload (Publish) ---
      console.log('Finishing video upload...');
      const finishResponse = await axios.post(
        initUrl,
        null,
        {
          params: {
            upload_phase: 'finish',
            access_token: pageAccessToken,
            upload_session_id: upload_session_id,
            description: content,
          },
        },
      );
      
      // --- FIX: Use type assertion ---
      if ((finishResponse.data as VideoFinishResponse).success) {
        console.log('Video post finished successfully.');
        return { success: true, postId: video_id, message: "Video posted successfully. It may take a few moments to process." };
      } else {
        throw new Error('Video upload finish phase returned success=false.');
      }

    } catch (error) {
      const errorData = error.response?.data;
      console.error(
        'Error posting regular video:', 
        errorData?.error || error.message,
        JSON.stringify(errorData)
      );
      throw new BadRequestException(error.response?.data?.error?.message || 'Failed to post regular video.');
    }
  }

  private async postReel(
    pageId: string,
    pageAccessToken: string,
    content: string,
    file: Express.Multer.File,
  ) {
    // --- FIX: Initialize videoId to null ---
    let videoId: string | null = null;
    try {
      // --- Step 1: Initialize Reel Upload ---
      console.log('Initializing Reel upload...');
      const initUrl = `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/video_reels`;
      const initResponse = await axios.post(
        initUrl,
        null,
        {
          params: {
            upload_phase: 'start',
            access_token: pageAccessToken,
          },
        },
      );

      // --- FIX: Use type assertion ---
      const { video_id, upload_url } = initResponse.data as ReelInitResponse;
      videoId = video_id; // Store for finish call
      console.log(`Reel Initialized. Video ID: ${video_id}`);

      // --- Step 2: Upload Video File to `upload_url` ---
      console.log('Uploading Reel data to external URL...');

      // --- FIX: Correct AxiosRequestConfig ---
      // Move maxContentLength & maxBodyLength to the root of the config object
      const uploadConfig: AxiosRequestConfig = {
        headers: {
          'Authorization': `OAuth ${pageAccessToken}`,
          'Content-Type': 'application/octet-stream',
          'Offset': '0',
          'File_Size': file.size.toString(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      };
      
      await axios.post(
        upload_url,
        file.buffer,
        uploadConfig,
      );
      console.log('Reel data uploaded.');

      // --- Step 3: Finish Upload (Publish) ---
      console.log('Checking Reel processing status...');
      let isProcessing = true;
      let attempts = 0;
      const maxAttempts = 10; 
      
      while (isProcessing && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await axios.get(
          `${this.FACEBOOK_GRAPH_API_URL}/${video_id}`,
          {
            params: {
              fields: 'status',
              access_token: pageAccessToken,
            },
          },
        );
        
        // --- FIX: Use type assertion ---
        const status = (statusResponse.data as ReelStatusResponse).status.status_code;
        console.log(`Reel status attempt ${attempts + 1}: ${status}`);

        if (status === 'READY') {
          isProcessing = false;
        } else if (status === 'ERROR' || status === 'TIMEOUT') {
          throw new Error(`Reel processing failed with status: ${status}`);
        }
        attempts++;
      }

      if (isProcessing) {
        throw new Error('Reel processing timed out. Did not become "READY".');
      }

      console.log('Reel is READY. Publishing...');
      const publishUrl = `${this.FACEBOOK_GRAPH_API_URL}/${pageId}/video_reels`;
      const publishResponse = await axios.post(
        publishUrl,
        null,
        {
          params: {
            upload_phase: 'finish',
            access_token: pageAccessToken,
            video_id: video_id,
            description: content,
            video_state: 'PUBLISHED', 
          },
        },
      );

      console.log('Reel published successfully.');
      // --- FIX: Use type assertion ---
      const finalPostId = (publishResponse.data as ReelPublishResponse).id;
      return { success: true, postId: finalPostId, message: "Reel posted successfully." };
      
    } catch (error) {
      const errorData = error.response?.data;
      console.error(
        'Error posting reel:', 
        errorData?.error || error.message,
        JSON.stringify(errorData)
      );
      // --- FIX: Check if videoId was assigned ---
      if (videoId) {
         console.error(`Error occurred for video_id: ${videoId}`);
      }
      throw new BadRequestException(error.response?.data?.error?.message || 'Failed to post reel.');
    }
  }
}