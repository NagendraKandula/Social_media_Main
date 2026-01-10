import { Channel } from "../ChannelSelector";
import ThreadsPreview from "./ThreadsPreview";
import TwitterPreview from "./TwitterPreview";
import LinkedInPreview from "./LinkedInPreview";
import InstagramPreview from "./InstagramPreview";
import FacebookPreview from "./FacebookPreview";
import YouTubePreview from "./YouTubePreview";

interface Props {
  channel: Channel;
  content: string;
  files: File[];
  platformState: Record<string, any>;
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
      return <LinkedInPreview content={content} mediaUrl={platformState.mediaUrl} />;

    case "instagram":
      return (
        <InstagramPreview
          content={content}
          mediaUrl={platformState.mediaUrl}
          mediaType={platformState.mediaType}
        />
      );

    case "facebook":
      return (
        <FacebookPreview
          content={content}
          mediaUrl={platformState.mediaUrl}
          mediaType={platformState.mediaType}
        />
      );

    case "youtube":
      return (
        <YouTubePreview
          title={platformState.title}
          description={content}
          mediaUrl={platformState.mediaUrl}
          mediaType={platformState.mediaType}
        />
      );

    default:
      return null;
  }
}
