import { MediaItem } from "../../types";

const getFallbackUrls = (item: MediaItem) => {
  const source = (item as any).source || {};
  const candidates = [
    source.secureUrl,
    source.fileUrl,
    source.mediaUrl,
    source.url,
    source.preview,
    source.publicUrl,
    source.downloadUrl,
    source.assetUrl,
  ];

  return candidates.filter(
    (url): url is string =>
      typeof url === "string" && url.length > 0 && url !== item.url
  );
};

const tryNextUrl = (
  event: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>,
  item: MediaItem
) => {
  const target = event.currentTarget;
  const attempted = Number(target.dataset.fallbackIndex || "0");
  const fallbackUrl = getFallbackUrls(item)[attempted];

  if (!fallbackUrl) return;

  target.dataset.fallbackIndex = String(attempted + 1);
  target.src = fallbackUrl;
};

interface MediaPreviewGridProps {
  files: MediaItem[];
  limit?: number;
  variant?: "default" | "instagram" | "instagram-story" | "instagram-reel" | "facebook-reel" | "linkedin" | "youtube";
  showOverflowCount?: boolean;
}

export default function MediaPreviewGrid({
  files,
  limit,
  variant = "default",
  showOverflowCount = false,
}: MediaPreviewGridProps) {
  const visibleFiles = typeof limit === "number" ? files.slice(0, limit) : files;
  const hiddenCount = typeof limit === "number" ? Math.max(files.length - limit, 0) : 0;

  if (visibleFiles.length === 0) {
    return (
      <div
        style={{
          aspectRatio:
            variant === "youtube"
              ? "16 / 9"
              : variant === "instagram-story" || variant === "instagram-reel" || variant === "facebook-reel"
                ? "9 / 16"
                : "1 / 1",
          background: variant === "youtube" ? "#111" : "#eef2f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: variant === "youtube" ? "#fff" : "#64748b",
          fontSize: 14,
        }}
      >
        Media preview
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: visibleFiles.length === 1 ? "1fr" : "repeat(2, minmax(0, 1fr))",
        gap: variant === "default" ? 6 : 0,
        overflow: "hidden",
        borderRadius: variant === "default" ? 10 : 0,
        background: variant === "youtube" ? "#000" : "#f1f5f9",
        width: "100%",
        height:
          variant === "instagram" ||
          variant === "instagram-story" ||
          variant === "instagram-reel" ||
          variant === "facebook-reel" ||
          variant === "linkedin" ||
          variant === "youtube"
            ? "100%"
            : "auto",
      }}
    >
      {visibleFiles.map((item, index) => {
        const src = item.url as string;
        const shouldShowOverflow = showOverflowCount && hiddenCount > 0 && index === visibleFiles.length - 1;

        return (
          <div
            key={item.id}
            style={{
              position: "relative",
              width: "100%",
              aspectRatio:
                variant === "youtube"
                  ? "16 / 9"
                  : variant === "instagram-story" || variant === "instagram-reel" || variant === "facebook-reel"
                    ? "9 / 16"
                    : "1 / 1",
              overflow: "hidden",
            }}
          >
            {item.type === "video" ? (
              <video
                src={src}
                controls
                muted
                playsInline
                onError={(event) => tryNextUrl(event, item)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  background: "#000",
                  display: "block",
                }}
              />
            ) : (
              <img
                src={src}
                alt={item.name || "Uploaded media preview"}
                onError={(event) => tryNextUrl(event, item)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  background: "#f1f5f9",
                  display: "block",
                }}
              />
            )}
            {shouldShowOverflow && (
              <div
                aria-label={`${hiddenCount} more media items`}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0, 0, 0, 0.48)",
                  color: "#ffffff",
                  fontSize: 30,
                  fontWeight: 700,
                }}
              >
                +{hiddenCount}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
