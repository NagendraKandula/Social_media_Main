"use client";

import { useEffect, useRef } from "react";
import styles from "../../styles/HomeCSS/HeroPostTunnel.module.css";

const POSTS = [
  { src: "/images/home/hero-posts/facebook-sunset-v3.png", label: "Facebook sunset post", platform: "facebook" },
  { src: "/images/home/hero-posts/instagram-daisy-v3.png", label: "Instagram daisy post", platform: "instagram" },
  { src: "/images/home/hero-posts/threads-roses-v3.png", label: "Threads roses post", platform: "threads" },
  { src: "/images/home/hero-posts/facebook-creator-v3.png", label: "Facebook creator post", platform: "facebook" },
  { src: "/images/home/hero-posts/instagram-food-creator-v3.png", label: "Instagram food creator post", platform: "instagram" },
  { src: "/images/home/hero-posts/linkedin-presenter-v3.png", label: "LinkedIn presenter post", platform: "linkedin" },
  { src: "/images/home/hero-posts/facebook-traveler-v3.png", label: "Facebook travel post", platform: "facebook" },
  { src: "/images/home/hero-posts/instagram-story-lighthouse-v3.png", label: "Instagram lighthouse story", platform: "instagram" },
] as const;

// The reversed buffer pair closes the loop before the next original pair enters.
// Keeping it at the boundary avoids placing duplicate artwork side by side.
const DISPLAY_POSTS = [...POSTS, POSTS[1], POSTS[0]];
const PAIR_COUNT = DISPLAY_POSTS.length / 2;

export default function HeroPostTunnel() {
  const tunnelRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pausedRef = useRef(false);

  useEffect(() => {
    const tunnel = tunnelRef.current;
    if (!tunnel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frameId = 0;
    let visible = false;
    const startedAt = performance.now();
    let pausedAt = 0;
    let pausedDuration = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !pausedRef.current) frameId = requestAnimationFrame(renderFrame);
      },
      { rootMargin: "120px" }
    );

    const renderFrame = (now: number) => {
      if (!visible || pausedRef.current) return;

      const width = tunnel.clientWidth;
      const elapsed = now - startedAt - pausedDuration;
      cardRefs.current.forEach((card, index) => {
        if (!card) return;

        // Posts travel as mirrored pairs: two small cards begin in the center,
        // then grow and move forward toward the outer edges together.
        const pair = Math.floor(index / 2);
        const side = index % 2 === 0 ? -1 : 1;
        const progress = (elapsed / 14000 + pair / PAIR_COUNT) % 1;
        // Distance, width and especially height increase together. The two
        // smallest cards therefore enter as squares before opening into the
        // taller overlapping posts at the edges.
        const easedProgress = progress * progress * (3 - 2 * progress);
        // Keep consecutive pairs close around the center so the black tunnel
        // is always covered, then accelerate them fully beyond the viewport.
        const travelProgress = Math.pow(progress, 1.5);
        // Half-card separation between centers leaves both synchronized entry
        // cards visible with an even 50% overlap.
        const centerPairOffset = 195 * 0.25;
        const x = side * (centerPairOffset + travelProgress * width * 0.6);
        // Keep the center pair slightly lower and lift each pair gradually as
        // it travels outward. This creates a shallow U instead of a sharp V.
        const y = 18 - easedProgress * 18;
        const cardWidth = 195 + easedProgress * 145;
        const cardHeight = 195 + easedProgress * 235;
        const rotation = side * easedProgress * -5;

        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardHeight}px`;
        card.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) rotateY(${rotation}deg)`;
        card.style.zIndex = String(Math.round(progress * 100));
      });

      frameId = requestAnimationFrame(renderFrame);
    };

    const pause = () => {
      if (pausedRef.current) return;
      pausedRef.current = true;
      pausedAt = performance.now();
      cancelAnimationFrame(frameId);
    };

    const resume = () => {
      if (!pausedRef.current) return;
      pausedRef.current = false;
      pausedDuration += performance.now() - pausedAt;
      if (visible) frameId = requestAnimationFrame(renderFrame);
    };

    tunnel.addEventListener("mouseenter", pause);
    tunnel.addEventListener("mouseleave", resume);
    tunnel.addEventListener("focusin", pause);
    tunnel.addEventListener("focusout", resume);
    observer.observe(tunnel);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      tunnel.removeEventListener("mouseenter", pause);
      tunnel.removeEventListener("mouseleave", resume);
      tunnel.removeEventListener("focusin", pause);
      tunnel.removeEventListener("focusout", resume);
    };
  }, []);

  return (
    <div
      ref={tunnelRef}
      className={styles.tunnel}
      aria-label="Social posts across connected channels"
    >
      <div className={styles.track} aria-hidden="true">
        <div className={styles.centerBackdrop} />
        {DISPLAY_POSTS.map((post, index) => (
          <div
            key={`${post.src}-${index}`}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            className={styles.card}
            data-center-card={index < 2 ? "true" : undefined}
          >
            <img className={styles.image} src={post.src} alt={post.label} loading={index < 4 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>
    </div>
  );
}
