import { StaticImageData } from 'next/image';

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string | StaticImageData;
  thumbnail?: string | StaticImageData;
  name?: string;
  size?: number;
  x?: number;
  y?: number;
  width?: number; 
  height?: number;
  rotation?: number;
  // Optional: You can attach the AI analysis directly to the media item 
  // if you want to support analyzing multiple images individually later.
  aiAnalysis?: AiAnalysisResult;
}
export interface PlatformRecommendation {
  platform: string; // e.g., 'Instagram', 'LinkedIn', 'Facebook', 'Threads', 'Twitter', 'YouTube'
  rating: number;   // 1 to 5 scale
  reason: string;   // Explanation of why this platform is recommended or not
}

export interface AiAnalysisResult {
  analysis: {
    summary: string;
    mood: string;
    audience: string;
    recommendedPlatforms: PlatformRecommendation[];
    bestAspectRatio: string;
    engagementPrediction: string;
    bestPostingTime: string;
  };
  content: {
    caption: string;
    hashtags: string[];
    cta: string;
    emoji: string[];
  };  // e.g., ["Crop to 4:5 for Instagram."]
}

// Optional: A type for the payload sent to the backend
export interface AiGeneratePayload {
  media?: File[];
  content?: string;
  platforms?: string[];
  action?: string;
  tone?: string;
  language?: string;
}