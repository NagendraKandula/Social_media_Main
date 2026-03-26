import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/ThreadsConnect.module.css";
import { SiThreads } from "react-icons/si";
import apiClient from "../lib/axios";

interface ThreadsConnectProps {
  onClose: () => void;
}

const ThreadsConnect: React.FC<ThreadsConnectProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  /* =========================
     CLOSE ON OUTSIDE CLICK
     ========================= */
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

  /* =========================
     CONNECT THREADS
     ========================= */
  const handleConnectThreads = async () => {
    setLoading(true);

    try {
      // 🔒 Validate session
      await apiClient.get("/auth/profile");

      const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      const redirectUri = encodeURIComponent(
        `${frontendUrl}/Landing?threads=connected`
      );

      window.location.href = `${backendUrl}/auth/threads?redirect=${redirectUri}`;
    } catch (error: any) {
      console.error("Threads connection error:", error);

      if (error?.response?.status === 401) {
        window.location.href = "/login";
        return;
      }

      alert("Unable to connect Threads. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div ref={popupRef} className={styles.threadsPopover}>
      <h3 className={styles.popupTitle}>Connect a Threads account</h3>

      <div className={styles.optionCard}>
        <div className={styles.optionHeader}>
          <SiThreads />
        </div>

        <h4>Threads Profile</h4>
        <p className={styles.subtitle}>
          Connect your Threads account to schedule text posts, join
          conversations, and grow your audience.
        </p>

        <button
          className={styles.primaryBtn}
          onClick={handleConnectThreads}
          disabled={loading}
        >
          {loading ? "Connecting..." : "Connect Threads"}
        </button>
      </div>

      <p className={styles.footer}>
        🔒 Secure connection using Threads’ official API
      </p>
    </div>
  );
};

export default ThreadsConnect;
