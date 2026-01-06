import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/LinkedInConnect.module.css";
import apiClient from "../lib/axios";

interface LinkedInConnectProps {
  onClose: () => void;
}

const LinkedInConnect: React.FC<LinkedInConnectProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

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

  // 🔒 BACKEND LOGIC — UNCHANGED
  const handleConnectLinkedIn = async () => {
    setLoading(true);
    try {
      await apiClient.get("/auth/profile");

      const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      const redirectUri = encodeURIComponent(
        `${frontendUrl}/Landing?linkedin=connected`
      );

      window.location.href = `${backendUrl}/auth/linkedin?redirect=${redirectUri}`;
    } catch (error: any) {
      console.error("Connection error:", error);
      if (error?.response?.status === 401) {
        window.location.href = "/login";
        return;
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
    window.location.href = `${BACKEND_URL}/auth/linkedin`;
  };

  return (
    <div ref={popupRef} className={styles.linkedinPopover}>
      {/* ✅ TITLE */}
      <h3 className={styles.popupTitle}>
        Connect a LinkedIn account
      </h3>

      {/* ✅ SINGLE CARD */}
      <div className={styles.optionCard}>
        <div className={styles.optionHeader}>
          <FaLinkedinIn />
        </div>
        
        {/* ... (Features List) ... */}

        <h4>LinkedIn Profile</h4>
        <p className={styles.subtitle}>
          Connect your LinkedIn account to schedule professional posts,
          manage content, and track engagement.
        </p>

        <button
          className={styles.primaryBtn}
          onClick={handleConnectLinkedIn}
          disabled={loading}
        >
          {loading ? "Connecting..." : "Connect LinkedIn"}
        </button>
      </div>

      <p className={styles.footer}>
        🔒 Secure connection using LinkedIn’s official API
      </p>
    </div>
  );
};

export default LinkedInConnect;