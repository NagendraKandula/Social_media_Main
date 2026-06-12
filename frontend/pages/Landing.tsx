import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { withAuth } from "../utils/withAuth";

import LHeader from "./Landing/LHeader";
import SubHeader from "./Landing/SubHeader";
import styles from "../styles/LandingCSS/Landing.module.css";
import Chatbot from "../components/Chatbot";

// Tabs
import ActivePlatforms from "./Landing/Tabs/ActivePlatforms";
import Create from "./Landing/Tabs/Create";
import Publish from "./Landing/Tabs/Publish";
import Planning from "./Landing/Tabs/Planning";
import Analytics from "./Landing/Tabs/Analytics";
import Summary from "./Landing/Tabs/Summary";

// Platform flows
import YouTubeConnect from "./Landing/Connect/YouTubeConnect";
import YouTubePost from "./Landing/Post/YouTubePost";
import InstagramConnect from "./Landing/Connect/InstagramConnect";
import FacebookPost from "./Landing/Post/facebook-post";
import TwitterConnect from "./Landing/Connect/TwitterConnect";
import TwitterPost from "./Landing/Post/TwitterPost";
import LinkedInConnect from "./Landing/Connect/LinkedInConnect";
import ThreadsConnect from "./Landing/Connect/ThreadsConnect";

/* ================= TAB CONSTANTS ================= */

const TABS = {
  ACTIVE: "Active Platforms",
  CREATE: "Create",
  PUBLISH: "Publish",
  SCHEDULE: "Schedule",
  ANALYTICS: "Analytics",
  SUMMARY: "Summary",
};

const Landing: React.FC = () => {
  const router = useRouter();

  /* ================= STATE ================= */

  const [activeTab, setActiveTab] = useState<string>(TABS.ACTIVE);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);

  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);

  /* ================= OAUTH REDIRECT HANDLING ================= */

  useEffect(() => {
    const { youtube, twitter, tab } = router.query;

    if (typeof tab === "string" && Object.values(TABS).includes(tab)) {
      setActiveTab(tab);
      setActivePlatform(null);
    }

    if (youtube === "connected") {
      setYoutubeConnected(true);
      setActivePlatform(null);
      setActiveTab(TABS.ACTIVE);
    }

    if (twitter === "connected") {
      setTwitterConnected(true);
      setActivePlatform(null);
      setActiveTab(TABS.ACTIVE);
    }

    if (youtube || twitter) {
      router.replace("/Landing", undefined, { shallow: true });
    }
  }, [router.query]);

  
  useEffect(() => {
    // Always clear old chats when entering dashboard
    localStorage.removeItem("chat_landing");
    localStorage.removeItem("chat_login");
    localStorage.removeItem("chat_postlogin"); 
  }, []);

  /* ================= TAB CONTENT ================= */

  const renderTabContent = () => {
    switch (activeTab) {
      case TABS.ACTIVE:
        return <ActivePlatforms />;
      case TABS.CREATE:
        return <Create />;
      case TABS.PUBLISH:
        return <Publish />;
      case TABS.SCHEDULE:
        return <Planning />;
      case TABS.ANALYTICS:
        return <Analytics />;
      case TABS.SUMMARY:
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
          <TwitterConnect onClose={() => setActivePlatform(null)} />
        );

      case "youtube":
        return youtubeConnected ? (
          <YouTubePost />
        ) : (
          <YouTubeConnect onClose={() => setActivePlatform(null)} />
        );

      case "instagram":
        return (
          <InstagramConnect onClose={() => setActivePlatform(null)} />
        );

      case "facebook":
        return <FacebookPost />;

      case "linkedin":
        return (
          <LinkedInConnect onClose={() => setActivePlatform(null)} />
        );

      case "threads":
        return (
          <ThreadsConnect onClose={() => setActivePlatform(null)} />
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
          <LHeader setActivePlatform={setActivePlatform} />
        </header>

        {/* ===== SUB HEADER ===== */}
        <SubHeader
          activeTab={activeTab}
          setActiveTab={(tab: string) => {
            setActiveTab(tab);
            setActivePlatform(null);
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
