import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/YouTubeConnect.module.css";
import { FaYoutube, FaCheckCircle } from "react-icons/fa";
import apiClient from "../lib/axios";

interface YouTubeConnectProps {
  onClose: () => void;
}

const YouTubeConnect: React.FC<YouTubeConnectProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  /* ✅ CLOSE ON OUTSIDE CLICK */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // 🔒 BACKEND LOGIC — UNCHANGED
  const handleConnectYouTube = async () => {
    setLoading(true);
    try {
      await apiClient.get("/auth/profile");

      const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      const redirectUri = encodeURIComponent(
        `${frontendUrl}/Landing?youtube=connected`
      );

      window.location.href = `${backendUrl}/auth/youtube?redirect=${redirectUri}`;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        window.location.href = "/login";
        return;
      }

      alert(
        "Unable to connect to YouTube. Check your internet or try again later."
      );
      setLoading(false);
    }
  };

  return (
    <div ref={popupRef} className={styles.youtubePopover}>
      {/* TITLE */}
      <h3 className={styles.popupTitle}>
        Connect a YouTube account
      </h3>

      {success && (
        <div className={styles.success}>
          <FaCheckCircle />
          YouTube connected successfully
        </div>
      )}

      {/* CARD */}
      <div className={styles.optionCard}>
        <div className={styles.optionHeader}>
          <FaYoutube />
        </div>

        <h4>YouTube Channel</h4>
        <p className={styles.subtitle}>
          Connect your YouTube account to upload videos, schedule content, and
          track performance.
        </p>

        <button
          className={styles.primaryBtn}
          onClick={handleConnectYouTube}
          disabled={loading}
        >
          {loading ? "Connecting..." : "Connect YouTube"}
        </button>
      </div>

      <p className={styles.footer}>
        🔒 Secure connection using YouTube’s official API
      </p>
    </div>
  );
};

export default YouTubeConnect;
