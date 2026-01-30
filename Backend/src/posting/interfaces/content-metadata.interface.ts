export interface ContentMetadata {
  text?: string;
  hashtags?: string[];
  mentions?: {
    username: string;
<<<<<<< HEAD
    platform: 'instagram'  | 'facebook' | 'linkedin' | 'threads' | 'youtube';
=======
    platform: 'instagram'  | 'facebook' | 'linkedin' | 'threads' | 'youtube' | 'twitter';
>>>>>>> main
    id?: string;
  }[];
  emojis?: string[];
  links?: {
    url: string;
    title?: string;
  }[];
  music?: {
    platform: string;
    musicId: string;
    startAt?: number;
  };
  // Platform-specific overrides (e.g., different text for LinkedIn)
  platformOverrides?: {
    [key: string]: { 
      text?: string;
      mediaUrl?: string; 
    };
  };
}