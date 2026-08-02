// frontend/config/platformLayouts.ts
//
// Defines the image "layouts" (placements) each channel publishes to, and the
// aspect ratio each layout needs. Used by the Publish page's Image Editing
// panel to tell the user which layouts look good and which need a crop
// adjustment before they publish.

import { Channel } from "../components/ChannelSelector";

export interface ImageLayoutSpec {
  id: string;
  channel: Channel;
  label: string;
  sizeLabel: string;
  ratio: number; // width / height
  tolerance: number; // fraction of ratio allowed before we flag it
  outputWidth: number;
  outputHeight: number;
  // Only relevant when the channel has more than one post type
  // (e.g. Instagram feed post vs. reel vs. story). Omit for
  // channels that only ever publish one layout.
  appliesTo?: (postType: string | undefined) => boolean;
}

export const PLATFORM_IMAGE_LAYOUTS: ImageLayoutSpec[] = [
  {
    id: "instagram-post",
    channel: "instagram",
    label: "Instagram Post",
    sizeLabel: "1:1",
    ratio: 1,
    tolerance: 0.05,
    outputWidth: 1080,
    outputHeight: 1080,
    appliesTo: (postType) => !postType || postType === "post",
  },
  {
    id: "instagram-reel",
    channel: "instagram",
    label: "Instagram Reel",
    sizeLabel: "9:16",
    ratio: 9 / 16,
    tolerance: 0.05,
    outputWidth: 1080,
    outputHeight: 1920,
    appliesTo: (postType) => postType === "reel",
  },
  {
    id: "instagram-story",
    channel: "instagram",
    label: "Instagram Story",
    sizeLabel: "9:16",
    ratio: 9 / 16,
    tolerance: 0.05,
    outputWidth: 1080,
    outputHeight: 1920,
    appliesTo: (postType) => postType === "story",
  },
  {
    id: "facebook-feed",
    channel: "facebook",
    label: "Facebook Post",
    sizeLabel: "1:1",
    ratio: 1,
    tolerance: 0.05,
    outputWidth: 1080,
    outputHeight: 1080,
    appliesTo: (postType) => !postType || postType === "feed",
  },
  {
    id: "facebook-reel",
    channel: "facebook",
    label: "Facebook Reel",
    sizeLabel: "9:16",
    ratio: 9 / 16,
    tolerance: 0.05,
    outputWidth: 1080,
    outputHeight: 1920,
    appliesTo: (postType) => postType === "reel",
  },
  {
    id: "facebook-story",
    channel: "facebook",
    label: "Facebook Story",
    sizeLabel: "9:16",
    ratio: 9 / 16,
    tolerance: 0.05,
    outputWidth: 1080,
    outputHeight: 1920,
    appliesTo: (postType) => postType === "story",
  },
  {
    id: "threads-post",
    channel: "threads",
    label: "Threads Post",
    sizeLabel: "1:1",
    ratio: 1,
    tolerance: 0.1,
    outputWidth: 1080,
    outputHeight: 1080,
  },
  {
    id: "twitter-post",
    channel: "twitter",
    label: "X Post",
    sizeLabel: "16:9",
    ratio: 16 / 9,
    tolerance: 0.08,
    outputWidth: 1600,
    outputHeight: 900,
  },
  {
    id: "linkedin-post",
    channel: "linkedin",
    label: "LinkedIn Post",
    sizeLabel: "1.91:1",
    ratio: 1200 / 627,
    tolerance: 0.08,
    outputWidth: 1200,
    outputHeight: 627,
  },
  {
    id: "youtube-video",
    channel: "youtube",
    label: "YouTube Thumbnail",
    sizeLabel: "16:9",
    ratio: 16 / 9,
    tolerance: 0.05,
    outputWidth: 1280,
    outputHeight: 720,
    appliesTo: (postType) => !postType || postType === "video",
  },
  {
    id: "youtube-shorts",
    channel: "youtube",
    label: "YouTube Shorts",
    sizeLabel: "9:16",
    ratio: 9 / 16,
    tolerance: 0.05,
    outputWidth: 1080,
    outputHeight: 1920,
    appliesTo: (postType) => postType === "shorts",
  },
];