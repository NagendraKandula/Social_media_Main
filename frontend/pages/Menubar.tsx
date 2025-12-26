// components/Menubar.tsx
import React from "react";
import { useRouter } from "next/router";  // import Next.js router
import styles from "../styles/menubar.module.css";

interface MenubarProps {
  setActivePlatform: (platform: string | null) => void;
}

const Menubar: React.FC<MenubarProps> = ({ setActivePlatform }) => {
  const router = useRouter();

  const handleClick = (platform: string) => {
    setActivePlatform(platform);

    // navigate to corresponding connect page
    // e.g. instagram → /instagram-connect
    // facebook → /facebook-connect
    // twitter → /twitter-connect, etc.
    router.push(`/${platform}Connect`);
  };

  return (
    <nav className={styles.menubar}>
      <div className={styles.channels}>

        <button
          type="button"
          onClick={() => handleClick("facebook")}
          className={styles.channelIcon}
        >
          Facebook
        </button>

        <button
          type="button"
          onClick={() => handleClick("youtube")}
          className={styles.channelIcon}
        >
          YouTube
        </button>

        <button
          type="button"
          onClick={() => handleClick("twitter")}
          className={styles.channelIcon}
        >
          Twitter
        </button>

        <button
          type="button"
          onClick={() => handleClick("linkedin")}
          className={styles.channelIcon}
        >
          LinkedIn
        </button>
        
        <button
          type="button"
          onClick={() => handleClick("instagram")}
          className={styles.channelIcon}
        >
          Instagram
        </button>

        <button
          type="button"
          onClick={() => handleClick("threads")}
          className={styles.channelIcon}
        >
          Threads
        </button>
      </div>
    </nav>
  );
};

export default Menubar;
