import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/FacebookConnect.module.css";
import { FaFacebookF, FaCheckCircle } from "react-icons/fa";
import apiClient from "../lib/axios";

interface FacebookConnectProps {
  onClose: () => void;
}

const FacebookConnect: React.FC<FacebookConnectProps> = ({ onClose }) => {
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
  const handleConnectFacebook = async () => {
    setLoading(true);
    try {
      await apiClient.get("/auth/profile");

      const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      const redirectUri = encodeURIComponent(
        `${frontendUrl}/Landing?facebook=connected`
      );

      window.location.href = `${backendUrl}/auth/facebook?redirect=${redirectUri}`;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        window.location.href = "/login";
        return;
      }
      console.error("Connection error:", error);
      alert("Unable to connect to Facebook. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div ref={popupRef} className={styles.facebookPopover}>
      {/* TITLE */}
      <h3 className={styles.popupTitle}>
        Connect a Facebook business account
      </h3>

      {success && (
        <div className={styles.success}>
          <FaCheckCircle />
          Facebook connected successfully
        </div>
      )}

      {/* CARD */}
      <div className={styles.optionCard}>
        <div className={styles.optionHeader}>
          <FaFacebookF />
        </div>

        <h4>Facebook Page</h4>
        <p className={styles.subtitle}>
          Connect a Facebook Page associated with a business account to manage
          posts, insights, and engagement.
        </p>

        <p className={styles.note}>
          ⚠️ Only Facebook <strong>Business Pages</strong> are supported.
        </p>

        <button
          className={styles.primaryBtn}
          onClick={handleConnectFacebook}
          disabled={loading}
        >
          {loading ? "Connecting..." : "Connect Facebook"}
        </button>
      </div>

      <p className={styles.footer}>
        🔒 Secure connection using Facebook’s official Graph API
      </p>
    </div>
  );
};

export default FacebookConnect;
