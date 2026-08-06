import type { Channel } from '../../components/ChannelSelector';

export type ChannelContentMap = Partial<Record<Channel, string>>;
export type PublishSidePanel = 'ai' | 'preview' | null;
export type ReviewMode = 'publish' | 'schedule';

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

