// components/DynamicPreview.tsx
import React, { useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "../styles/DynamicPreview.module.css";
import { MediaItem } from "../types";

// Platform Previews
const FacebookPreview = dynamic(() => import("./preview/FacebookPreview"));
const TwitterPreview = dynamic(() => import("./preview/TwitterPreview"));
const InstagramPreview = dynamic(() => import("./preview/InstagramPreview"));
const LinkedInPreview = dynamic(() => import("./preview/LinkedInPreview"));
const ThreadsPreview = dynamic(() => import("./preview/ThreadsPreview"));
const YouTubePreview = dynamic(() => import("./preview/YouTubePreview"));

interface DynamicPreviewProps {
  selectedPlatforms: string[];
  content: string;
  mediaFiles: any[];
  facebookPostType?: "feed" | "reel" | "story";
  instagramPostType?: "post" | "reel" | "story";
  youtubeType?: "video" | "shorts";
  accounts?: Partial<Record<string, PreviewAccount>>;
  facebookPage?: PreviewAccount;
}

export interface PreviewAccount {
  name?: string;
  username?: string;
  profilePic?: string;
}

const getMediaUrl = (file: any) => {
  if (!file) return "";

  if (typeof File !== "undefined" && (file instanceof File || file instanceof Blob)) {
    return URL.createObjectURL(file);
  }

  const rawUrl =
    file.url ||
    file.preview ||
    file.mediaUrl ||
    file.secureUrl ||
    file.publicUrl ||
    file.src ||
    "";

  if (typeof rawUrl === "string") {
    return rawUrl;
  }

  if (rawUrl && typeof rawUrl.src === "string") {
    return rawUrl.src;
  }

  return "";
};

const getMediaType = (file: any): "image" | "video" => {
  const mimeType = file?.type || file?.mimeType || "";
  const mediaType = file?.mediaType || "";

  if (
    mimeType.startsWith("video/") ||
    mediaType.toString().toLowerCase() === "video"
  ) {
    return "video";
  }

  return "image";
};

export default function DynamicPreview({
  selectedPlatforms,
  content,
  mediaFiles,
  facebookPostType = "feed",
  instagramPostType = "post",
  youtubeType = "video",
  accounts = {},
  facebookPage,
}: DynamicPreviewProps) {

  const mediaPreviews: MediaItem[] = useMemo(() => {
    return mediaFiles
      .map((file, index) => ({
        id: file?.id || `file-${index}-${file?.name || "media"}`,
        url: getMediaUrl(file),
        type: getMediaType(file),
        name: file?.name || file?.fileName || "Uploaded media",
        size: file?.size,
      }))
      .filter((preview) => Boolean(preview.url));
  }, [mediaFiles]);

  useEffect(() => {
    return () => {
      mediaPreviews.forEach((preview) => {
        const url = preview.url as string;
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [mediaPreviews]);

  const hasContent = content.trim() !== "" || mediaPreviews.length > 0;

  const renderPlatformPreview = (platform: string) => {
    const account =
      platform === "facebook" && facebookPage?.name
        ? { ...accounts[platform], ...facebookPage }
        : accounts[platform];

    switch (platform) {
      case "facebook":
        return (
          <FacebookPreview
            content={content}
            files={mediaPreviews}
            account={account}
            postType={facebookPostType}
          />
        );

      case "twitter":
        return <TwitterPreview content={content} files={mediaPreviews} />;

      case "instagram":
        return (
          <InstagramPreview
            content={content}
            files={mediaPreviews}
            postType={instagramPostType}
            account={account}
          />
        );

      case "linkedin":
        return <LinkedInPreview content={content} files={mediaPreviews} account={account} />;

      case "threads":
        return <ThreadsPreview content={content} files={mediaPreviews} account={account} />;

      case "youtube":
        return (
          <YouTubePreview
            description={content}
            files={mediaPreviews}
            account={account}
            postType={youtubeType}
          />
        );

      default:
        return null;
    }
  };

  const previewPlatforms = selectedPlatforms.filter((platform) =>
    ["facebook", "twitter", "instagram", "linkedin", "threads", "youtube"].includes(platform)
  );

  return (
    <div className={styles.previewContainer}>
      {hasContent && previewPlatforms.length > 0 ? (
        <div className={styles.previewScroll}>
          {previewPlatforms.map((platform) => (
            <section key={platform} className={styles.previewItem}>
              {renderPlatformPreview(platform)}
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.welcomeMessage}>
          <p>Preview will appear here</p>
          <span>Select a platform to see how your post looks.</span>
        </div>
      )}
    </div>
  );
}
