"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "../../styles/HomeCSS/MainContent.module.css";

/* ---------- Icon set (shared line-icon style, 20px, currentColor) ---------- */

const Icon = {
  sparkle: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 2.5L11.4 7.7L16.6 9.1L11.4 10.5L10 15.7L8.6 10.5L3.4 9.1L8.6 7.7L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M16 2.5L16.6 4.6L18.7 5.2L16.6 5.8L16 7.9L15.4 5.8L13.3 5.2L15.4 4.6L16 2.5Z" fill="currentColor" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10.5" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 6.5V10.5L12.6 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  barChart: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 17V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10 17V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16.5 17V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2.5 17H17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4.2" width="14" height="12.8" rx="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 8.2H17" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.6 2.5V5.4M13.4 2.5V5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="6.8" cy="11.5" r="0.95" fill="currentColor" />
      <circle cx="10" cy="11.5" r="0.95" fill="currentColor" />
      <circle cx="6.8" cy="14.4" r="0.95" fill="currentColor" />
    </svg>
  ),
  mediaStack: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5.2" y="3.5" width="11.3" height="9.3" rx="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 6.6V14.8C3 15.9 3.9 16.8 5 16.8H13.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8.2" cy="6.9" r="1.1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.4 11.4L8.8 8.9L11 11L13.6 8.2L16.5 11.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.8" y="2.8" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11.2" y="2.8" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2.8" y="11.2" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11.2" y="11.2" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 13V3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6.5 6.5L10 3L13.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 12V15.2C3.5 16 4.2 16.7 5 16.7H15C15.8 16.7 16.5 16 16.5 15.2V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  pencil: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12.9 3.6L16.4 7.1L7 16.5L3.2 17.3L4 13.5L12.9 3.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M11.2 5.3L14.7 8.8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  hash: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 3L5.5 17M14.5 3L12.5 17M3.5 8H16.5M3 12.5H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 3L9.2 10.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 3L11.8 17L9.2 10.8L3 8.2L17 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.2 8.4L6.2 11.4L12.8 4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

type Feature = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const FEATURES: Feature[] = [
  { id: "ai", title: "AI Assistant", description: "Generate ideas, optimize copy, and analyze media instantly.", icon: Icon.sparkle },
  { id: "schedule", title: "Scheduling", description: "Set it and forget it. Publish at the perfect time for your audience.", icon: Icon.clock },
  { id: "analytics", title: "Analytics", description: "Track engagement and growth across every connected profile.", icon: Icon.barChart },
  { id: "calendar", title: "Calendar", description: "Get a bird's-eye view of your entire social media pipeline.", icon: Icon.calendar },
  { id: "media", title: "Media Library", description: "Store and organize your visual assets in one central hub.", icon: Icon.mediaStack },
  { id: "multi", title: "Multi-platform", description: "Push tailored content to six different platforms simultaneously.", icon: Icon.grid },
];

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", mark: "in" },
  { id: "x", label: "X", mark: "X" },
  { id: "instagram", label: "Instagram", mark: "IG" },
  { id: "facebook", label: "Facebook", mark: "f" },
  { id: "youtube", label: "YouTube", mark: "▶" },
  { id: "threads", label: "Threads", mark: "@" },
];

const VALUE_PROPS = [
  {
    id: "platforms",
    title: "6 platforms, one queue",
    description: "Publish to every channel without juggling six different tabs.",
    icon: Icon.grid,
  },
  {
    id: "publish",
    title: "One-click publishing",
    description: "Format once. Push everywhere, tailored per platform automatically.",
    icon: Icon.send,
  },
  {
    id: "review",
    title: "AI-powered content review",
    description: "Every post gets checked for tone, grammar, and hashtags before it goes out.",
    icon: Icon.sparkle,
  },
];

const WORKFLOW_STEPS = [
  { title: "Upload content", icon: Icon.upload },
  { title: "AI reviews it", icon: Icon.sparkle },
  { title: "Caption improved", icon: Icon.pencil },
  { title: "Hashtags suggested", icon: Icon.hash },
  { title: "Ready to publish", icon: Icon.send },
];

const AI_BEFORE_CAPTION = "just posted our new product check it out";
const AI_AFTER_CAPTION =
  "Say hello to our newest product — built to make your week easier. Available now.";
const AI_IMPROVEMENT_TAGS = ["Tone improved", "Grammar fixed", "Hashtags added", "Best time picked"];

function useRevealOnScroll(count: number) {
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const [visible, setVisible] = useState<boolean[]>(() => Array(count).fill(false));

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setVisible(Array(count).fill(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            setVisible((prev) => {
              if (prev[index]) return prev;
              const next = [...prev];
              next[index] = true;
              return next;
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [count]);

  return { refs, visible };
}

export default function MainContent() {
  const { refs: featureRefs, visible: visibleFeatures } = useRevealOnScroll(FEATURES.length);

  return (
    <main className={styles.mainContent}>
      <div className={styles.backgroundGlow} aria-hidden="true" />

      {/* 1. HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              AI-powered social media management
            </span>

            <h1 className={styles.heading}>
              Manage every social channel from one AI-powered workspace
            </h1>

            <p className={styles.subheading}>
              Create, review with AI, schedule, and publish content across Facebook,
              Instagram, LinkedIn, X, Threads, and YouTube — all from a single workspace.
            </p>

            <div className={styles.heroActions}>
              <Link href="/Auth/register" className={styles.ctaButton}>
                Get Started Free
              </Link>
              <Link href="/Auth/login" className={styles.secondaryButton}>
                Log in
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.appMockupHero}>
              <div className={styles.dashboardChrome}>
                <span className={styles.chromeDots}>
                  <span className={styles.chromeDot} />
                  <span className={styles.chromeDot} />
                  <span className={styles.chromeDot} />
                </span>
                <span className={styles.dashboardTitle}>Publish</span>
              </div>

              {/*
                Swap this mockup for a real screenshot of your Publish page
                once you have one, e.g.:
                <Image src="/images/publish-preview.png" alt="Publish dashboard" fill />
              */}
              <div className={styles.mockupBodyHero}>
                <div className={styles.mockupSidebar}>
                  <span className={styles.mockupSidebarIcon}>{Icon.sparkle}</span>
                  <span className={styles.mockupSidebarLabel}>AI Assistant</span>
                  <span className={styles.mockupSidebarPulse} />
                </div>

                <div className={styles.mockupContent}>
                  <span className={styles.mockupLine} style={{ width: "88%" }} />
                  <span className={styles.mockupLine} style={{ width: "64%" }} />
                  <span className={styles.mockupLine} style={{ width: "72%" }} />
                  <span className={styles.mockupMediaChip}>Media attached</span>
                </div>

                <div className={styles.mockupPreview}>
                  <div className={styles.mockupPreviewAvatar} />
                  <span className={styles.mockupPreviewLine} style={{ width: "70%" }} />
                  <span className={styles.mockupPreviewLine} style={{ width: "50%" }} />
                  <div className={styles.mockupPreviewImage} />
                </div>
              </div>
            </div>

            <div className={styles.floatingBadgeTop}>
              <span className={styles.floatingIconCalendar} aria-hidden="true" />
              Ready to publish
            </div>
            <div className={styles.floatingBadgeBottom}>
              <span className={styles.floatingIconSparkle} aria-hidden="true">
                {Icon.sparkle}
              </span>
              AI caption generated
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRUSTED PLATFORMS */}
      <section className={styles.platformsSection}>
        <p className={styles.sectionLabel}>Seamlessly integrated with</p>
        <div className={styles.platformGrid}>
          {PLATFORMS.map((platform) => (
            <div key={platform.id} className={styles.platformBadge}>
              <span className={styles.platformMark} aria-hidden="true">
                {platform.mark}
              </span>
              {platform.label}
            </div>
          ))}
        </div>
      </section>

      {/* 3. WHY SOCI — value props */}
      <section className={styles.valueSection}>
        <div className={styles.valueGrid}>
          {VALUE_PROPS.map((prop) => (
            <div key={prop.id} className={styles.valueCard}>
              <span className={styles.valueIconBadge}>{prop.icon}</span>
              <h3 className={styles.valueTitle}>{prop.title}</h3>
              <p className={styles.valueDescription}>{prop.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. AI WORKFLOW + ASSISTANT PREVIEW */}
      <section className={styles.aiWorkflowSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Smart Publishing
          </span>
          <h2 className={styles.sectionHeading}>AI-powered from draft to publish</h2>
        </div>

        <div className={styles.workflowGrid}>
          <div className={styles.workflowSteps}>
            {WORKFLOW_STEPS.map((step, idx) => (
              <div className={styles.workflowStep} key={step.title}>
                <span className={styles.workflowIconBadge}>{step.icon}</span>
                <h4 className={styles.workflowStepTitle}>{step.title}</h4>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <span className={styles.workflowConnector} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          <div className={styles.aiPreviewPanel}>
            <div className={styles.aiPreviewHeader}>
              <span className={styles.aiPreviewIcon}>{Icon.sparkle}</span>
              AI Assistant
            </div>

            <div className={styles.aiBeforeAfter}>
              <div className={styles.aiCaptionBlock}>
                <span className={styles.aiCaptionLabel}>Before</span>
                <p className={styles.aiCaptionText}>{AI_BEFORE_CAPTION}</p>
              </div>

              <span className={styles.aiArrow} aria-hidden="true">
                {Icon.send}
              </span>

              <div className={`${styles.aiCaptionBlock} ${styles.aiCaptionAfter}`}>
                <span className={styles.aiCaptionLabel}>After</span>
                <p className={styles.aiCaptionText}>{AI_AFTER_CAPTION}</p>
              </div>
            </div>

            <div className={styles.aiTagRow}>
              {AI_IMPROVEMENT_TAGS.map((tag) => (
                <span key={tag} className={styles.aiTag}>
                  <span className={styles.aiTagCheck}>{Icon.check}</span>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. CORE FEATURES (6 Cards) */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionHeading}>Everything your team needs</h2>
        </div>

        <div className={styles.featureGrid}>
          {FEATURES.map((feature, index) => (
            <div
              key={feature.id}
              ref={(el) => {
                featureRefs.current[index] = el;
              }}
              data-index={index}
              className={`${styles.featureCard} ${
                visibleFeatures[index] ? styles.featureCardVisible : ""
              }`}
              style={{ transitionDelay: `${index * 75}ms` }}
            >
              <span className={styles.featureIconBadge}>{feature.icon}</span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. PLANNING CALENDAR PREVIEW */}
      <section className={styles.screenshotSection}>
        <div className={styles.screenshotText}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Organization
          </span>
          <h2 className={styles.sectionHeading}>Plan with precision.</h2>
          <p className={styles.subheading}>
            Drag, drop, and organize your monthly content pipeline visually across all
            your brands and channels.
          </p>
        </div>
        <div className={styles.screenshotVisual}>
          <div className={styles.appMockupStandard}>
            {/* Swap for <Image src="/images/calendar-preview.png" alt="Planning calendar" fill /> */}
            <span className={styles.placeholderIcon}>{Icon.calendar}</span>
            <span className={styles.placeholderText}>Add your Planning Calendar screenshot here</span>
          </div>
        </div>
      </section>

      {/* 7. ANALYTICS PREVIEW */}
      <section className={styles.screenshotSectionAlt}>
        <div className={styles.screenshotVisual}>
          <div className={styles.appMockupStandard}>
            {/* Swap for <Image src="/images/analytics-preview.png" alt="Analytics dashboard" fill /> */}
            <span className={styles.placeholderIcon}>{Icon.barChart}</span>
            <span className={styles.placeholderText}>Add your Analytics Dashboard screenshot here</span>
          </div>
        </div>
        <div className={styles.screenshotText}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Insights
          </span>
          <h2 className={styles.sectionHeading}>Measure what matters.</h2>
          <p className={styles.subheading}>
            Unified reporting to prove ROI, track audience growth, and understand
            performance in real-time.
          </p>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className={styles.bottomCtaSection}>
        <div className={styles.bottomCtaContent}>
          <h2 className={styles.ctaHeading}>
            Start managing every social channel from one intelligent workspace.
          </h2>
          <Link href="/Auth/register" className={styles.ctaButtonHighlight}>
            Get Started Free
          </Link>
          <p className={styles.ctaFlow}>Create · Review · Schedule · Publish</p>
          <p className={styles.ctaSubtext}>No credit card required · Start scheduling in under 2 minutes.</p>
        </div>
      </section>
    </main>
  );
}
