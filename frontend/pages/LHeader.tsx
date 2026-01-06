import React, { useState, useEffect } from "react";
import styles from "../styles/lheader.module.css";
import {
  FaInstagram,
  FaTwitter,
  FaFacebookF,
  FaLinkedinIn,
  FaYoutube,
  FaBell,
  FaCog,
} from "react-icons/fa";
import { SiThreads } from "react-icons/si";
import { useRouter } from "next/router";
import apiClient from "../lib/axios";

import InstagramConnect from "./InstagramConnect";
import FacebookConnect from "./FacebookConnect";
import YouTubeConnect from "./YouTubeConnect";
import TwitterConnect from "./TwitterConnect";
import LinkedInConnect from "./LinkedInConnect";
import ThreadsConnect from "./ThreadsConnect";

interface LHeaderProps {
  setActivePlatform: (platform: string | null) => void; // kept for future use
}

type ConnectedMap = {
  instagram?: boolean;
  facebook?: boolean;
  youtube?: boolean;
};

type PopupType =
  | "instagram"
  | "facebook"
  | "youtube"
  | "twitter"
  | "linkedin"
  | "threads"
  | null;

const LHeader: React.FC<LHeaderProps> = () => {
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<PopupType>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedMap>(
    {}
  );

  /* ================= FETCH CONNECTED PLATFORMS ================= */
  useEffect(() => {
    const fetchConnectedPlatforms = async () => {
      try {
        const res = await apiClient.get("/auth/social/active-accounts");
        const connected: ConnectedMap = {};
        Object.keys(res.data || {}).forEach((key) => {
          connected[key as keyof ConnectedMap] = true;
        });
        setConnectedPlatforms(connected);
      } catch (error) {
        console.error("Failed to fetch connected platforms:", error);
      }
    };

    fetchConnectedPlatforms();
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout", {}, { withCredentials: true });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const togglePopup = (popup: PopupType) => {
    setActivePopup((prev) => (prev === popup ? null : popup));
  };

  return (
    <header className={styles.header}>
      {/* Logo */}
      <div className={styles.logo}>
        Story<span className={styles.dot}>.</span>
      </div>

      {/* Platforms */}
      <div className={styles.channels}>
        {/* Instagram */}
        <div className={styles.iconWrapper}>
          <button
            className={`${styles.channelIcon} ${
              connectedPlatforms.instagram ? styles.connected : ""
            }`}
            onClick={() => togglePopup("instagram")}
          >
            <FaInstagram />
          </button>
          {activePopup === "instagram" && (
            <InstagramConnect onClose={() => setActivePopup(null)} />
          )}
        </div>

        {/* Twitter */}
        <div className={styles.iconWrapper}>
          <button
            className={styles.channelIcon}
            onClick={() => togglePopup("twitter")}
          >
            <FaTwitter />
          </button>
          {activePopup === "twitter" && (
            <TwitterConnect onClose={() => setActivePopup(null)} />
          )}
        </div>

        {/* YouTube */}
        <div className={styles.iconWrapper}>
          <button
            className={`${styles.channelIcon} ${
              connectedPlatforms.youtube ? styles.connected : ""
            }`}
            onClick={() => togglePopup("youtube")}
          >
            <FaYoutube />
          </button>
          {activePopup === "youtube" && (
            <YouTubeConnect onClose={() => setActivePopup(null)} />
          )}
        </div>

        {/* LinkedIn */}
        <div className={styles.iconWrapper}>
          <button
            className={styles.channelIcon}
            onClick={() => togglePopup("linkedin")}
          >
            <FaLinkedinIn />
          </button>
          {activePopup === "linkedin" && (
            <LinkedInConnect onClose={() => setActivePopup(null)} />
          )}
        </div>

        {/* Facebook */}
        <div className={styles.iconWrapper}>
          <button
            className={`${styles.channelIcon} ${
              connectedPlatforms.facebook ? styles.connected : ""
            }`}
            onClick={() => togglePopup("facebook")}
          >
            <FaFacebookF />
          </button>
          {activePopup === "facebook" && (
            <FacebookConnect onClose={() => setActivePopup(null)} />
          )}
        </div>

        {/* Threads */}
        <div className={styles.iconWrapper}>
          <button
            className={styles.channelIcon}
            onClick={() => togglePopup("threads")}
          >
            <SiThreads />
          </button>
          {activePopup === "threads" && (
            <ThreadsConnect onClose={() => setActivePopup(null)} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.notification}>
          <FaBell />
        </button>

        <button className={styles.settings}>
          <FaCog />
        </button>

        <div className={styles.profileContainer}>
          <button
            className={styles.profilePic}
            onClick={() => setDropdownOpen((o) => !o)}
          >
            <span className={styles.profileInitial}>A</span>
          </button>

          {dropdownOpen && (
            <div className={styles.profileDropdown}>
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default LHeader;
