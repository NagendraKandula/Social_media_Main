import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import axios from "../../lib/axios";
import { withAuth } from "../../utils/withAuth";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  DASHBOARD_TABS,
  DashboardTab,
  resetDashboardView,
  setActivePlatform,
  setActiveTab,
} from "../../store/dashboardSlice";

import LHeader from "./LHeader";
import SubHeader from "./SubHeader";
import styles from "../../styles/LandingCSS/Landing.module.css";
import { addNotification } from "../../utils/notifications";

// Tabs
const ActivePlatforms = dynamic(() => import("./Tabs/ActivePlatforms"), {
  loading: () => <p>Loading connections...</p>,
  ssr: false,
});
const Create = dynamic(() => import("./Tabs/Create"), {
  loading: () => <p>Loading creator...</p>,
});
const Publish = dynamic(() => import("./Tabs/Publish"), {
  loading: () => <p>Loading publisher...</p>,
});
const Planning = dynamic(() => import("./Tabs/Planning"), {
  loading: () => <p>Loading planner...</p>,
});
const Analytics = dynamic(() => import("./Tabs/Analytics"), {
  loading: () => <p>Loading analytics...</p>,
});
const Summary = dynamic(() => import("./Tabs/Summary"), {
  loading: () => <p>Loading summary...</p>,
});

// Platform flows
const YouTubeConnect = dynamic(() => import("./Connect/YouTubeConnect"));
const YouTubePost = dynamic(() => import("./Post/YouTubePost"));
const InstagramConnect = dynamic(() => import("./Connect/InstagramConnect"));
const FacebookPost = dynamic(() => import("./Post/facebook-post"));
const TwitterConnect = dynamic(() => import("./Connect/TwitterConnect"));
const TwitterPost = dynamic(() => import("./Post/TwitterPost"));
const LinkedInConnect = dynamic(() => import("./Connect/LinkedInConnect"));
const ThreadsConnect = dynamic(() => import("./Connect/ThreadsConnect"));
const Chatbot = dynamic(() => import("../../components/Chatbot"), {
  ssr: false,
});

/* ================= TAB CONSTANTS ================= */

const Landing: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  /* ================= STATE ================= */

  const { activeTab, activePlatform } = useAppSelector((state) => state.dashboard);

  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const publishStatusSnapshot = useRef<Record<string, string>>({});
  const publishStatusInitialized = useRef(false);

  const getNotificationSnippet = (post: any) => {
    const plainText = String(post?.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plainText) return plainText.length > 72 ? `${plainText.slice(0, 72)}...` : plainText;
    const mediaCount = Array.isArray(post?.mediaItems) ? post.mediaItems.length : 0;
    return mediaCount > 0 ? `Media post with ${mediaCount} file${mediaCount === 1 ? '' : 's'}` : 'Untitled post';
  };

  const platformLabels: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    youtube: "YouTube",
    twitter: "X (Twitter)",
    linkedin: "LinkedIn",
    threads: "Threads",
  };

  /* ================= OAUTH REDIRECT HANDLING ================= */

  useEffect(() => {
    const { tab } = router.query;

    if (typeof tab === "string" && Object.values(DASHBOARD_TABS).includes(tab as DashboardTab)) {
      dispatch(setActiveTab(tab as DashboardTab));
    }

    const connectedPlatform = Object.keys(platformLabels).find(
      (platform) => router.query[platform] === "connected"
    );

    if (connectedPlatform) {
      if (connectedPlatform === "youtube") setYoutubeConnected(true);
      if (connectedPlatform === "twitter") setTwitterConnected(true);

      addNotification({
        type: "success",
        title: `${platformLabels[connectedPlatform]} connected`,
        message: `${platformLabels[connectedPlatform]} is ready for publishing and scheduling.`,
      });

      dispatch(resetDashboardView());
      window.dispatchEvent(new Event("social-accounts-updated"));
      router.replace("/Landing", undefined, { shallow: true });
    }
  }, [dispatch, router]);

  
  useEffect(() => {
    // Always clear old chats when entering dashboard
    localStorage.removeItem("chat_landing");
    localStorage.removeItem("chat_login");
    localStorage.removeItem("chat_postlogin"); 
  }, []);

  useEffect(() => {
    const getPlatformStatusKey = (postId: number, platform: string) => `${postId}-${platform}`;
    const wasScheduledPost = (post: any) => Boolean(post.scheduledAt);

    const pollPublishedPosts = async () => {
      try {
        const response = await axios.get("/posting/scheduled?offset=0");
        const nextSnapshot: Record<string, string> = {};

        response.data.forEach((post: any) => {
          const platformStatuses = Array.isArray(post.platformStatuses)
            ? post.platformStatuses
            : [];

          platformStatuses.forEach((platformStatus: any) => {
            const platform = String(platformStatus.platform || "").toLowerCase();
            const status = String(platformStatus.status || "").toUpperCase();
            if (!platform) return;

            const key = getPlatformStatusKey(post.id, platform);
            const previousStatus = publishStatusSnapshot.current[key];
            nextSnapshot[key] = status;

            if (
              status === "PUBLISHED" &&
              wasScheduledPost(post) &&
              (!publishStatusInitialized.current || previousStatus !== "PUBLISHED")
            ) {
              const platformName = platformLabels[platform] || platform;
              addNotification({
                type: "success",
                title: `${platformName} post published`,
                message: getNotificationSnippet(post),
                details: [
                  { label: "Post ID", value: String(post.id) },
                  { label: "Channel", value: platformName },
                  { label: "Media", value: `${post.mediaItems?.length || 0} file${(post.mediaItems?.length || 0) === 1 ? "" : "s"}` },
                  { label: "Published", value: new Date().toLocaleString() },
                ],
                dedupeKey: `published-${key}`,
              });
            }
          });
        });

        publishStatusSnapshot.current = nextSnapshot;
        publishStatusInitialized.current = true;
      } catch (error) {
        console.error("Failed to check published posts", error);
      }
    };

    pollPublishedPosts();
    const interval = window.setInterval(pollPublishedPosts, 30000);
    return () => window.clearInterval(interval);
  }, []);

  /* ================= TAB CONTENT ================= */

  const renderTabContent = () => {
    switch (activeTab) {
      case DASHBOARD_TABS.ACTIVE:
        return <ActivePlatforms />;
      case DASHBOARD_TABS.CREATE:
        return <Create />;
      case DASHBOARD_TABS.PUBLISH:
        return <Publish />;
      case DASHBOARD_TABS.SCHEDULE:
        return <Planning />;
      case DASHBOARD_TABS.ANALYTICS:
        return <Analytics />;
      case DASHBOARD_TABS.SUMMARY:
        return <Summary />;
      default:
        return null;
    }
  };

  /* ================= PLATFORM POPUPS ================= */

  const renderPlatformPopup = () => {
    switch (activePlatform) {
      case "twitter":
        return twitterConnected ? (
          <TwitterPost />
        ) : (
          <TwitterConnect onClose={() => dispatch(setActivePlatform(null))} />
        );

      case "youtube":
        return youtubeConnected ? (
          <YouTubePost />
        ) : (
          <YouTubeConnect onClose={() => dispatch(setActivePlatform(null))} />
        );

      case "instagram":
        return (
          <InstagramConnect onClose={() => dispatch(setActivePlatform(null))} />
        );

      case "facebook":
        return <FacebookPost />;

      case "linkedin":
        return (
          <LinkedInConnect onClose={() => dispatch(setActivePlatform(null))} />
        );

      case "threads":
        return (
          <ThreadsConnect onClose={() => dispatch(setActivePlatform(null))} />
        );

      default:
        return null;
    }
  };

  /* ================= RENDER ================= */

  return (
    <>
      <div className={styles.container}>
        {/* ===== MAIN HEADER ===== */}
        <header className={styles.header}>
          <LHeader setActivePlatform={(platform) => dispatch(setActivePlatform(platform))} />
        </header>

        {/* ===== SUB HEADER ===== */}
        <SubHeader
          activeTab={activeTab}
          setActiveTab={(tab: string) => {
            dispatch(setActiveTab(tab as DashboardTab));
          }}
        />

        {/* ===== PAGE CONTENT ===== */}
        <main className={styles.content}>
          {renderTabContent()}
        </main>

        {/* ===== PLATFORM POPUPS ===== */}
        {activePlatform && renderPlatformPopup()}
      </div>

      {/* DASHBOARD CHATBOT */}
      <Chatbot type="post-login" />
    </>
  );
};

export default Landing;

export const getServerSideProps = withAuth(async (context) => {
  return {
    props: {},
  };
});
