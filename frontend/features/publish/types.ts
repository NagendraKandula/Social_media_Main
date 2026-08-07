import type { Channel } from '../../components/ChannelSelector';

export type ChannelContentMap = Partial<Record<Channel, string>>;
export type PublishSidePanel = 'ai' | 'preview' | null;
export type ReviewMode = 'publish' | 'schedule';

export type MediaPlacement = 'FEED' | 'STORY' | 'REEL' | 'SHORT' | 'CAROUSEL';

export interface ImageEditDestination {
  platform: string;
  placement: MediaPlacement;
  label: string;
  ratio: number;
}

export interface MediaEditDraft {
  platform: string;
  placement: MediaPlacement;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  rotation: number;
  focalX?: number;
  focalY?: number;
}

export type MediaEditMap = Record<string, MediaEditDraft>;

export interface FacebookPage {
  id: string;
  name: string;
  pictureUrl?: string | null;
  picture?: { data?: { url?: string } };
}

export interface SocialAccount {
  name: string;
  username?: string;
  profilePic?: string;
  needsReconnect?: boolean;
}
