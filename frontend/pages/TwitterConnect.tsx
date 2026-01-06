import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/TwitterConnect.module.css";
import { FaTwitter, FaCheckCircle } from "react-icons/fa";
import apiClient from "../lib/axios";

interface TwitterConnectProps {
  onClose: () => void;
}

const TwitterConnect: React.FC<TwitterConnectProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // ✅ CLOSE ON OUTSIDE CLICK
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleConnectTwitter = async () => {
    setLoading(true);
    try {
      await apiClient.get("/auth/profile");

      const redirectUri = encodeURIComponent(
        `${frontendUrl}/Landing?twitter=connected`
      );

      window.location.href = `${backendUrl}/twitter/authorize?redirect=${redirectUri}`;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        window.location.href = "/login";
        return;
      }
      alert("Unable to connect to Twitter. Try again later.");
      setLoading(false);
    }
  };

  return (
    <div ref={popupRef} className={styles.twitterPopover}>
      <h3 className={styles.popupTitle}>Connect a Twitter account</h3>

      <div className={styles.optionCard}>
        <div className={styles.optionHeader}>
          <FaTwitter />
        </div>

        <h4>Twitter Profile</h4>
        <p className={styles.subtitle}>
          Connect your Twitter account to schedule tweets and track engagement.
        </p>

        <button
          className={styles.primaryBtn}
          onClick={handleConnectTwitter}
          disabled={loading}
        >
          {loading ? "Connecting..." : "Connect Twitter"}
        </button>
      </div>

      <p className={styles.footer}>
        🔒 Secure connection using Twitter’s official API
      </p>
    </div>
  );
};

export default TwitterConnect;
