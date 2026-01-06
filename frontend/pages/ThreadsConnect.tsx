import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/ThreadsConnect.module.css";
import { SiThreads } from "react-icons/si";

interface ThreadsConnectProps {
  onClose: () => void;
}

const ThreadsConnect: React.FC<ThreadsConnectProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const THREADS_APP_ID = process.env.NEXT_PUBLIC_THREADS_APP_ID!;
  const REDIRECT_URI = process.env.NEXT_PUBLIC_THREADS_REDIRECT_URL!;
  const SCOPES = ["threads_basic", "threads_content_publish"];

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

  // 🔒 BACKEND / OAUTH LOGIC — UNCHANGED
  const handleConnectThreads = () => {
    try {
      setLoading(true);

      const authUrl = new URL("https://www.threads.net/oauth/authorize");
      authUrl.searchParams.set("client_id", THREADS_APP_ID);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("scope", SCOPES.join(","));
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("state", crypto.randomUUID());

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error("Connection error:", error);
      alert("Unable to connect to Threads. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div ref={popupRef} className={styles.threadsPopover}>
      {/* ✅ TITLE */}
      <h3 className={styles.popupTitle}>
        Connect a Threads account
      </h3>

      {/* ✅ SINGLE CARD */}
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
