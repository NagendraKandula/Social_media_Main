import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";

import LHeader from "./LHeader";
import SubHeader from "./SubHeader";
import styles from "../styles/Landing.module.css";

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

const Landing: React.FC = () => {
  const router = useRouter();

  /* ================= STATE ================= */

  const [activeTab, setActiveTab] = useState<string>("Create");
  const [activePlatform, setActivePlatform] = useState<string | null>(null);

  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);

  /* ================= OAUTH REDIRECT HANDLING ================= */

  useEffect(() => {
    const { youtube, twitter } = router.query;

    if (youtube === "connected") {
      setYoutubeConnected(true);
      setActivePlatform(null);
      setActiveTab("Create");
    }

    if (twitter === "connected") {
      setTwitterConnected(true);
      setActivePlatform(null);
      setActiveTab("Create");
    }

    if (youtube || twitter) {
      router.replace("/Landing", undefined, { shallow: true });
    }
  }, [router.query]);

  /* ================= TAB CONTENT ================= */

  const renderTabContent = () => {
    switch (activeTab) {
      case "Active Platforms":
        return <ActivePlatforms />;
      case "Create":
        return <Create />;
      case "Templates":
        return <Templates />;
      case "Publish":
        return <Publish />;
      case "Schedule":
        return <Planning />;
      case "Analytics":
        return <Analytics />;
      case "Summary":
        return <Summary />;
      default:
        return null;
    }
  };

  /* ================= PLATFORM POPUPS ================= */

  const renderPlatformPopup = () => {
    switch (activePlatform) {
      case "twitter":
        return (
          twitterConnected ? (
            <TwitterPost />
          ) : (
            <TwitterConnect onClose={() => setActivePlatform(null)} />
          )
        );

      case "youtube":
        return (
          youtubeConnected ? (
            <YouTubePost />
          ) : (
            <YouTubeConnect onClose={() => setActivePlatform(null)} />
          )
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
  );
};

export default Landing;
