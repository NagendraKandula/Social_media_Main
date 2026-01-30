import { Channel } from "../components/ChannelSelector";

export interface BuildPayloadParams {
  channel: Channel;
  content: string;
  files: File[];
  platformState: Record<string, any>;
}

export function buildPayload({
  channel,
  content,
  files,
  platformState,
}: BuildPayloadParams): FormData | Record<string, any> {
  switch (channel) {
    case "threads": {
      const formData = new FormData();
      formData.append("content", content);

      if (files.length > 0) {
        formData.append("file", files[0]);
      }

      return formData;
    }

    case "twitter": {
      const formData = new FormData();
      formData.append("text", content);

      if (files.length > 0) {
        formData.append("file", files[0]);
      }

      return formData;
    }

    case "linkedin": {
      return {
        text: content,
        mediaUrl: platformState.linkedinMediaUrl || undefined,
        mediaType: platformState.linkedinMediaType || undefined,
      };
    }

    case "facebook": {
      return {
        content,
        mediaUrl: platformState.mediaUrl,
        mediaType: platformState.mediaType,
        pageId: platformState.pageId,
      };
    }

    case "instagram": {
      return {
        content,
        mediaUrl: platformState.mediaUrl,
        mediaType: platformState.mediaType,
      };
    }

    case "youtube": {
      return {
        mediaUrl: platformState.mediaUrl,
        mediaType: platformState.mediaType,
        title: platformState.title,
        description: content,
        visibility: platformState.visibility,
        category: platformState.category,
      };
    }

    default:
      throw new Error(`Unsupported channel: ${channel}`);
  }
}
