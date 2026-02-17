import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import styles from "../styles/InstagramConnect.module.css";
import { FaInstagram, FaFacebookF, FaCheckCircle } from "react-icons/fa";
import apiClient from "../lib/axios";

interface InstagramConnectProps {
  onClose: () => void;
}

const InstagramConnect: React.FC<InstagramConnectProps> = ({ onClose }) => {
  const router = useRouter();
  const popupRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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

  /* 🔒 EXISTING REDIRECT LOGIC — UNCHANGED */
  useEffect(() => {
    if (router.query.instagram === "connected") {
      setSuccess(true);
      setError(null);
      router.replace(router.pathname, undefined, { shallow: true });
    }

    if (router.query.error) {
      setError("Failed to connect Instagram. Please try again.");
    }
  }, [router.query]);

  // 🔒 BACKEND LOGIC — UNCHANGED
  const handleConnect = async () => {
    try {
      setLoading(true);
      await apiClient.get("/auth/profile");

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      window.location.href = `${backendUrl}/auth/instagram`;
    } catch (err: any) {
      setLoading(false);
      if (err?.response?.status === 401) {
        router.push("/login");
      } else {
        setError("Unable to initiate connection.");
      }
    }
  };

  return (
    <div ref={popupRef} className={styles.instagramPopover}>
      {/* TITLE */}
      <h3 className={styles.popupTitle}>
        Choose the type of account you’d like to connect
      </h3>

      {success && (
        <div className={styles.success}>
          <FaCheckCircle />
          Instagram connected successfully
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {/* CARDS */}
      <div className={styles.cardRow}>
        {/* Professional */}
        <div className={styles.optionCard}>
          <div className={styles.optionHeader}>
            <FaInstagram />
          </div>

          <h4>Professional Account</h4>
          <p className={styles.subtitle}>
            Connect your Instagram professional account directly.
          </p>

          <button
            onClick={handleConnect}
            disabled={loading || success}
            className={styles.primaryBtn}
          >
            {loading ? "Connecting..." : "Connect account"}
          </button>
        </div>

        {/* Via Facebook */}
        <div className={`${styles.optionCard} ${styles.recommended}`}>
          <div className={styles.optionHeader}>
            <FaFacebookF />
            <span className={styles.badge}>Recommended</span>
          </div>

          <h4>Instagram via Facebook</h4>
          <p className={styles.subtitle}>
            Connect Instagram using your Facebook Page to unlock analytics and
            publishing.
          </p>

          <button
            onClick={handleConnect}
            disabled={loading || success}
            className={styles.secondaryBtn}
          >
            {loading ? "Connecting..." : "Connect account"}
          </button>
        </div>
      </div>

      <p className={styles.footer}>
        🔒 Secure connection using Instagram’s official API
      </p>
    </div>
  );
};

export default InstagramConnect;
