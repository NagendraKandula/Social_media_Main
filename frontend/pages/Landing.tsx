import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { withAuth } from "../utils/withAuth";

import LHeader from "./LHeader";
import SubHeader from "./SubHeader";
import styles from "../styles/Landing.module.css";
import Chatbot from "../components/Chatbot"; 

// Tabs
import ActivePlatforms from "./ActivePlatforms";
import Create from "./Create";
import Templates from "./Templates";
import Publish from "./Publish";
import Planning from "./Planning";
import Analytics from "./Analytics";
import Summary from "./Summary";

// Platform flows
import YouTubeConnect from "./YouTubeConnect";
import YouTubePost from "./YouTubePost";
import InstagramConnect from "./InstagramConnect";
import FacebookPost from "./facebook-post";
import TwitterConnect from "./TwitterConnect";
import TwitterPost from "./TwitterPost";
import LinkedInConnect from "./LinkedInConnect";
import ThreadsConnect from "./ThreadsConnect";

/* ================= TAB CONSTANTS ================= */

const TABS = {
  ACTIVE: "Active Platforms",
  CREATE: "Create",
  TEMPLATES: "Templates",
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
    const { youtube, twitter } = router.query;

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

  /* ================= TAB CONTENT ================= */

  const renderTabContent = () => {
    switch (activeTab) {
      case TABS.ACTIVE:
        return <ActivePlatforms />;
      case TABS.CREATE:
        return <Create />;
      case TABS.TEMPLATES:
        return <Templates />;
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