import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
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

// Tabs
const ActivePlatforms = dynamic(() => import("./Tabs/ActivePlatforms"), {
  loading: () => <p>Loading active platforms...</p>,
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

  /* ================= OAUTH REDIRECT HANDLING ================= */

  useEffect(() => {
    const { youtube, twitter, tab } = router.query;

    if (typeof tab === "string" && Object.values(DASHBOARD_TABS).includes(tab as DashboardTab)) {
      dispatch(setActiveTab(tab as DashboardTab));
    }

    if (youtube === "connected") {
      setYoutubeConnected(true);
      dispatch(resetDashboardView());
    }

    if (twitter === "connected") {
      setTwitterConnected(true);
      dispatch(resetDashboardView());
    }

    if (youtube || twitter) {
      router.replace("/Landing", undefined, { shallow: true });
    }
  }, [dispatch, router]);

  
  useEffect(() => {
    // Always clear old chats when entering dashboard
    localStorage.removeItem("chat_landing");
    localStorage.removeItem("chat_login");
    localStorage.removeItem("chat_postlogin"); 
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
