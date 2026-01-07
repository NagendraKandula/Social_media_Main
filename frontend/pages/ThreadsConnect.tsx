import React, { useState, useEffect } from "react";
import styles from "../styles/ThreadsConnect.module.css";
import { SiThreads } from "react-icons/si";
import apiClient from "../lib/axios";

const ThreadsConnect: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  const handleConnectThreads = () => {
    if (!currentUserId) {
      alert("Please log in again to connect Threads.");
      return;
    }

    try {
      setLoading(true);

      // 🚀 REDIRECT TO BACKEND
      // The backend (SocialAuthController) will securely build the URL 
      // with the Client ID, Redirect URI, and the userId in the 'state'.
      window.location.href = `${BACKEND_URL}/auth/threads`; 

    } catch (error) {
      console.error("Connection error:", error);
      alert("Unable to connect to Threads. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Connect Threads</h2>
        <p className={styles.description}>
            Connect your Threads account to auto-publish content.
        </p>
        
        <button
          className={styles.connectButton}
          onClick={handleConnectThreads}
          disabled={loading || !currentUserId}
        >
          <SiThreads className={styles.icon} />
          {loading ? "Connecting..." : "Continue with Threads"}
        </button>
      </div>
    </div>
  );
};

export default ThreadsConnect;