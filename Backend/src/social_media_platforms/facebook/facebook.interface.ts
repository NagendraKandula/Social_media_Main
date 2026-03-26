export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

export interface FacebookAttachedMedia {
  media_fbid: string;
}

export interface FacebookPostResponse {
  id: string;
  post_id?: string;
}