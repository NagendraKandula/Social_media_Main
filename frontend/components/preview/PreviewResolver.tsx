import { Channel } from "../ChannelSelector";
import { MediaItem } from "../../types";

import ThreadsPreview from "./ThreadsPreview";
import TwitterPreview from "./TwitterPreview";
import LinkedInPreview from "./LinkedInPreview";
import InstagramPreview from "./InstagramPreview";
import FacebookPreview from "./FacebookPreview";
import YouTubePreview from "./YouTubePreview";

interface Props {
  channel: Channel;
  content: string;
  files: MediaItem[];          // ✅ FIXED
  platformState: Record<string, any>; // still usable for YouTube title etc.
}

export default function PreviewResolver({
  channel,
  content,
  files,
  platformState,
}: Props) {
  switch (channel) {
    case "threads":
      return <ThreadsPreview content={content} files={files} />;

    case "twitter":
      return <TwitterPreview content={content} files={files} />;

    case "linkedin":
      return <LinkedInPreview content={content} files={files} />;

    case "instagram":
      return <InstagramPreview content={content} files={files} />;

    case "facebook":
      return <FacebookPreview content={content} files={files} />;

    case "youtube":
      return (
        <YouTubePreview
          title={platformState?.title}
          description={content}
          files={files}
        />
      );

    default:
      return null;
  }
}
