import React, { useState, useEffect } from "react";
import styles from "../styles/TwitterConnect.module.css";
import apiClient from "../lib/axios";

const TwitterConnect: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ✅ Get Backend URL
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiClient.get('/auth/profile');
        if (res.data && res.data.id) setCurrentUserId(res.data.id.toString());
      } catch (error) {
        console.error("Not authenticated", error);
      }
    };
    fetchUser();
  }, []);

  const handleConnect = () => {
    if (!currentUserId) {
        alert("Please log in again.");
        return;
    }
    setLoading(true);
    // 🚀 Secure Redirect to Backend
    window.location.href = `${BACKEND_URL}/auth/twitter`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Connect Twitter</h2>
        <p className={styles.description}>
            Post tweets and view engagement directly from here.
        </p>
        
        <button
          className={styles.connectButton}
          onClick={handleConnect}
          disabled={loading || !currentUserId}
        >
          {loading ? "Connecting..." : "Connect Twitter"}
        </button>
      </div>
    </div>
  );
};

export default TwitterConnect;