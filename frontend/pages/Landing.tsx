import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import LHeader from "./LHeader";
import Sidebar from "./Sidebar";
import styles from "../styles/Landing.module.css";

// Import pages
import Create from "./Create";
import Templates from "./Templates";
import Publish from "./Publish";
import Planning from "./Planning";
import Analytics from "./Analytics";
import Summary from "./Summary";
import YouTubeConnect from "./YouTubeConnect";
import YouTubePost from "./YouTubePost";
import InstagramConnect from "./InstagramConnect";
import FacebookConnect from "./FacebookConnect";
import TwitterConnect from "./TwitterConnect";
import TwitterPost from "./TwitterPost";
import LinkedInConnect from "./LinkedInConnect";
import PinterestConnect from "./PinterestConnect";
import ThreadsConnect from "./ThreadsConnect";
import FacebookPost from "./facebook-post";

const Landing = () => {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState("Create");
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);

  // Check URL query for YouTube or Twitter connection
  useEffect(() => {
    if (router.query.youtube === "connected") {
      setActivePlatform("youtube");
      setYoutubeConnected(true);
      router.replace("/Landing", undefined, { shallow: true });
    }

    if (router.query.twitter === "connected") {
      setActivePlatform("twitter");
      setTwitterConnected(true);
      router.replace("/Landing", undefined, { shallow: true });
    }
  }, [router.query]);

  const renderContent = () => {
    if (activePlatform) {
      switch (activePlatform) {
        case "youtube":
          return youtubeConnected ? <YouTubePost /> : <YouTubeConnect />;
        case "twitter":
          return twitterConnected ? <TwitterPost /> : <TwitterConnect />;
        case "instagram":
          // Assuming you have a way to check if Instagram is connected
          // For now, let's assume it's always the connect page
          return <InstagramConnect />;
        case "facebook":
          return <FacebookConnect />;
        case "linkedin":
          return <LinkedInConnect />;
        case "pinterest":
          return <PinterestConnect />;
        case "threads":
          return <ThreadsConnect />;
        default:
          return <div>Select a platform</div>;
      }
    }

    switch (activeSegment) {
      case "Create":
        return <Create />;
      case "Templates":
        return <Templates />;
      case "Publish":
        return <Publish />;
      case "Planning":
        return <Planning />;
      case "Analytics":
        return <Analytics />;
      case "Summary":
        return <Summary />;
      default:
        return <div>Welcome</div>;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <LHeader setActivePlatform={setActivePlatform} />
      </header>

      <div className={styles.main}>
        <Sidebar
          activeSegment={activeSegment}
          setActiveSegment={setActiveSegment}
          activePlatform={activePlatform}
          setActivePlatform={setActivePlatform} // <-- Pass the setActivePlatform function here
        />
        <main className={styles.content}>{renderContent()}</main>
      </div>
    </div>
  );
};

export default Landing;