import React, { useState, useRef } from "react";
import styles from "../styles/Templates.module.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlatformConfig {
  id: string;
  name: string;
  badge: string;
  color: string;
  w: number;
  h: number;
  seedOffset: number;
  count: number;
}

interface PicsumImage {
  id: number;
  src: string;
}

interface CarouselSectionProps {
  platform: PlatformConfig;
  onUseTemplate: (src: string, platformId: string) => void;
}

interface TemplatesProps {
  /** Called when user clicks "Use Template" on any card */
  onUseTemplate?: (templateImage: string, platformId: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const buildImages = (count: number, seedOffset: number, w: number, h: number): PicsumImage[] =>
  Array.from({ length: count }, (_, i) => ({
    id: seedOffset + i,
    src: `https://picsum.photos/seed/${seedOffset + i}/${w}/${h}`,
  }));

const platforms: PlatformConfig[] = [
  { id: "instagram-post",   name: "Instagram Posts",      badge: "1:1",    color: "#E1306C", w: 200, h: 200, seedOffset: 10,  count: 10 },
  { id: "instagram-story",  name: "Instagram Stories",    badge: "9:16",   color: "#833AB4", w: 120, h: 210, seedOffset: 30,  count: 10 },
  { id: "youtube-thumb",    name: "YouTube Thumbnails",   badge: "16:9",   color: "#FF0000", w: 280, h: 158, seedOffset: 50,  count: 9  },
  { id: "youtube-post",     name: "YouTube Community",    badge: "1:1",    color: "#FF0000", w: 200, h: 200, seedOffset: 70,  count: 9  },
  { id: "linkedin",         name: "LinkedIn Posts",       badge: "1.91:1", color: "#0A66C2", w: 300, h: 157, seedOffset: 100, count: 9  },
  { id: "twitter",          name: "X / Twitter Posts",    badge: "16:9",   color: "#000000", w: 280, h: 158, seedOffset: 130, count: 9  },
  { id: "threads",          name: "Threads Posts",        badge: "1:1",    color: "#101010", w: 200, h: 200, seedOffset: 160, count: 9  },
  { id: "facebook",         name: "Facebook Posts",       badge: "1.91:1", color: "#1877F2", w: 300, h: 157, seedOffset: 190, count: 9  },
];

const FILTERS = [
  { label: "All",        value: "all"       },
  { label: "Instagram",  value: "instagram" },
  { label: "YouTube",    value: "youtube"   },
  { label: "LinkedIn",   value: "linkedin"  },
  { label: "X / Twitter",value: "twitter"  },
  { label: "Threads",    value: "threads"   },
  { label: "Facebook",   value: "facebook"  },
];

// ── CarouselSection ───────────────────────────────────────────────────────────

function CarouselSection({ platform, onUseTemplate }: CarouselSectionProps) {
  const images = buildImages(platform.count, platform.seedOffset, platform.w, platform.h);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    carouselRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const handleUseTemplate = (img: PicsumImage) => {
    // Derive the base platform id: "instagram-post" → "instagram"
    const basePlatformId = platform.id.split("-")[0];
    onUseTemplate(img.src, basePlatformId);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <span className={styles.dot} style={{ background: platform.color }} />
          {platform.name}
          <span
            className={styles.badge}
            style={{ background: platform.color + "18", color: platform.color }}
          >
            {platform.badge}
          </span>
        </div>
        <button className={styles.seeAll}>See all →</button>
      </div>

      <div className={styles.carouselWrap}>
        <button
          className={`${styles.scrollBtn} ${styles.scrollLeft}`}
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div className={styles.carousel} ref={carouselRef}>
          {images.map((img) => (
            <div
              key={img.id}
              className={styles.card}
              style={{ width: platform.w, height: platform.h }}
            >
              <img
                src={img.src}
                alt={`Template ${img.id}`}
                className={styles.cardImg}
                loading="lazy"
              />
              <div className={styles.cardOverlay}>
                <button
                  className={styles.useTemplateBtn}
                  onClick={() => handleUseTemplate(img)}
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className={`${styles.scrollBtn} ${styles.scrollRight}`}
          onClick={() => scroll(1)}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ── Templates page ────────────────────────────────────────────────────────────

const Templates = ({ onUseTemplate }: TemplatesProps) => {
  const [activeFilter, setActiveFilter] = useState("all");

  const visible = platforms.filter((p) =>
    activeFilter === "all" ? true : p.id.startsWith(activeFilter)
  );

  const handleUseTemplate = (src: string, platformId: string) => {
    if (onUseTemplate) onUseTemplate(src, platformId);
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Social Media Templates</h2>
        <p className={styles.pageSubtitle}>
          Browse ready-made templates for all your social platforms.
        </p>
      </div>

      <div className={styles.filterBar}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`${styles.chip} ${activeFilter === f.value ? styles.chipActive : ""}`}
            onClick={() => setActiveFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.sections}>
        {visible.map((p) => (
          <CarouselSection
            key={p.id}
            platform={p}
            onUseTemplate={handleUseTemplate}
          />
        ))}
      </div>
    </div>
  );
};

export default Templates;