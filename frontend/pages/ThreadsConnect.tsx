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

  // ✅ Get Backend URL safely (uses env variable or defaults to localhost)
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiClient.get('/auth/profile');
        if (res.data && res.data.id) {
          setCurrentUserId(res.data.id.toString());
        }
      } catch (error) {
        console.error("Not authenticated", error);
      }
    };
    fetchUser();
  }, []);

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
    if (!currentUserId) {
      alert("Please log in again to connect Threads.");
      return;
    }

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
          disabled={loading || !currentUserId}
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
