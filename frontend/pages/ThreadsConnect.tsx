import React, { useState, useEffect } from "react";
import styles from "../styles/ThreadsConnect.module.css";
import { SiThreads } from "react-icons/si";
import apiClient from "../lib/axios"; // ✅ Import your axios client

const ThreadsConnect: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const THREADS_APP_ID = process.env.NEXT_PUBLIC_THREADS_APP_ID!;
  const REDIRECT_URI = process.env.NEXT_PUBLIC_THREADS_REDIRECT_URL!;
  const SCOPES = ["threads_basic", "threads_content_publish"];

  // ✅ 1. Fetch the User ID when component loads
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

      // ✅ 2. Embed the real User ID into the state
      const stateObj = {
        userId: currentUserId, // <--- This fixes the "undefined" error
        nonce: crypto.randomUUID()
      };
      const stateString = JSON.stringify(stateObj);

      const authUrl = new URL("https://www.threads.net/oauth/authorize");
      authUrl.searchParams.set("client_id", THREADS_APP_ID);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("scope", SCOPES.join(","));
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("state", stateString); // ✅ Sending ID here

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error("Connection error:", error);
      alert("Unable to connect to Threads. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* ... (Your existing UI) ... */}
        
        <button
          className={styles.connectButton}
          onClick={handleConnectThreads}
          disabled={loading || !currentUserId} // Disable if user not loaded
        >
          <SiThreads />
          {loading ? "Connecting..." : "Continue with Threads"}
        </button>

        {/* ... */}
      </div>
    </div>
  );
};

export default ThreadsConnect;