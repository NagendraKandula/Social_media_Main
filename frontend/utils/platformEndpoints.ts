import { Channel } from "../components/ChannelSelector";

export function getEndpoint(channel: Channel): string {
  switch (channel) {
    case "threads":
      return "/threads/post";

    case "twitter":
      return "/twitter/post-media";

    case "linkedin":
      return "/linkedin/post";

    case "facebook":
      return "/facebook/post";

    case "instagram":
      return "/instagram/post";

    case "youtube":
      return "/youtube/upload-video";

    default:
      throw new Error(`No endpoint for ${channel}`);
  }
}
