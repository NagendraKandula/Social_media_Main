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
}