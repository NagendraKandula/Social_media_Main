// components/DynamicPreview.tsx
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "../styles/DynamicPreview.module.css";
import { MediaItem } from "../types";
import { getStableObjectUrl } from "../utils/mediaObjectUrl";

// Platform Previews
const FacebookPreview = dynamic(() => import("./preview/FacebookPreview"));
const TwitterPreview = dynamic(() => import("./preview/TwitterPreview"));
const InstagramPreview = dynamic(() => import("./preview/InstagramPreview"));
const LinkedInPreview = dynamic(() => import("./preview/LinkedInPreview"));
const ThreadsPreview = dynamic(() => import("./preview/ThreadsPreview"));
const YouTubePreview = dynamic(() => import("./preview/YouTubePreview"));
const PREVIEWS_PER_PAGE = 3;

interface DynamicPreviewProps {
  horizontal?: boolean;
  selectedPlatforms: string[];
  content: string;
  channelContents?: Partial<Record<string, string>>;
  mediaFiles: any[];
  mediaFilesByPlatform?: Partial<Record<string, any[]>>;
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
    return getStableObjectUrl(file);
  }

  const rawUrl =
    file.url ||
    file.preview ||
    file.mediaUrl ||
    file.secureUrl ||
    file.fileUrl ||
    file.downloadUrl ||
    file.publicUrl ||
    file.assetUrl ||
    file.src ||
    "";

  if (typeof rawUrl === "string") {
    return rawUrl;
  }

  if (rawUrl && typeof rawUrl.src === "string") {
    return rawUrl.src;
  }

  if (rawUrl && typeof rawUrl.url === "string") {
    return rawUrl.url;
  }

  return "";
};

const getMediaType = (file: any): "image" | "video" => {
  const type = (file?.type || "").toString().toLowerCase();
  const mimeType = (file?.mimeType || "").toString().toLowerCase();
  const mediaType = (file?.mediaType || "").toString().toLowerCase();

  if (
    type === "video" ||
    type.startsWith("video/") ||
    mimeType.startsWith("video/") ||
    mediaType === "video"
  ) {
    return "video";
  }

  return "image";
};

const toMediaPreviews = (files: any[]): MediaItem[] =>
  files
    .map((file, index) => ({
      id: file?.id || `file-${index}-${file?.name || "media"}`,
      url: getMediaUrl(file),
      type: getMediaType(file),
      name: file?.name || file?.fileName || "Uploaded media",
      size: file?.size,
      source: file,
    }))
    .filter((preview) => Boolean(preview.url));

export default function DynamicPreview({
  horizontal = false,
  selectedPlatforms,
  content,
  channelContents = {},
  mediaFiles,
  mediaFilesByPlatform = {},
  facebookPostType = "feed",
  instagramPostType = "post",
  youtubeType = "video",
  accounts = {},
  facebookPage,
}: DynamicPreviewProps) {
  const [previewPage, setPreviewPage] = useState(0);
  const mediaPreviews = useMemo(() => {
    return toMediaPreviews(mediaFiles);
  }, [mediaFiles]);

  const platformMediaPreviews = useMemo(() => {
    return Object.fromEntries(
      Object.entries(mediaFilesByPlatform).map(([platform, files]) => [
        platform,
        toMediaPreviews(files || []),
      ])
    );
  }, [mediaFilesByPlatform]);

  const hasContent =
    content.trim() !== "" ||
    Object.values(channelContents).some((channelContent) => channelContent?.trim()) ||
    mediaPreviews.length > 0;

  const renderPlatformPreview = (platform: string) => {
    const platformContent = channelContents[platform] ?? content;
    const previewFiles = platformMediaPreviews[platform] || mediaPreviews;
    const account =
      platform === "facebook" && facebookPage?.name
        ? { ...accounts[platform], ...facebookPage }
        : accounts[platform];

    switch (platform) {
      case "facebook":
        return (
          <FacebookPreview
            content={platformContent}
            files={previewFiles}
            account={account}
            postType={facebookPostType}
          />
        );

      case "twitter":
        return <TwitterPreview content={platformContent} files={previewFiles} />;

      case "instagram":
        return (
          <InstagramPreview
            content={platformContent}
            files={previewFiles}
            postType={instagramPostType}
            account={account}
          />
        );

      case "linkedin":
        return <LinkedInPreview content={platformContent} files={previewFiles} account={account} />;

      case "threads":
        return <ThreadsPreview content={platformContent} files={previewFiles} account={account} />;

      case "youtube":
        return (
          <YouTubePreview
            description={platformContent}
            files={previewFiles}
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
  const previewPageCount = Math.max(1, Math.ceil(previewPlatforms.length / PREVIEWS_PER_PAGE));
  const visiblePlatforms = horizontal
    ? previewPlatforms.slice(
        previewPage * PREVIEWS_PER_PAGE,
        (previewPage + 1) * PREVIEWS_PER_PAGE
      )
    : previewPlatforms;

  useEffect(() => {
    setPreviewPage((currentPage) => Math.min(currentPage, previewPageCount - 1));
  }, [previewPageCount]);

  return (
    <div className={styles.previewContainer}>
      {hasContent && previewPlatforms.length > 0 ? (
        <div className={`${styles.previewGallery} ${horizontal ? styles.previewGalleryHorizontal : ""}`}>
          {horizontal && previewPlatforms.length > PREVIEWS_PER_PAGE && (
            <button
              type="button"
              className={`${styles.previewNavigationButton} ${styles.previewNavigationPrevious}`}
              onClick={() => setPreviewPage((page) => Math.max(0, page - 1))}
              disabled={previewPage === 0}
              aria-label="Previous post previews"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
          )}
          <div
            className={`${styles.previewScroll} ${horizontal ? styles.previewScrollHorizontal : ""}`}
            style={horizontal
              ? { gridTemplateColumns: `repeat(${visiblePlatforms.length}, minmax(0, 1fr))` }
              : undefined}
          >
            {visiblePlatforms.map((platform) => (
              <section key={platform} className={styles.previewItem}>
                {renderPlatformPreview(platform)}
              </section>
            ))}
          </div>
          {horizontal && previewPlatforms.length > PREVIEWS_PER_PAGE && (
            <button
              type="button"
              className={`${styles.previewNavigationButton} ${styles.previewNavigationNext}`}
              onClick={() => setPreviewPage((page) => Math.min(previewPageCount - 1, page + 1))}
              disabled={previewPage >= previewPageCount - 1}
              aria-label="Next post previews"
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          )}
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
