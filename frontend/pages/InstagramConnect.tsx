import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/InstagramConnect.module.css";
import { FaInstagram, FaCheckCircle } from "react-icons/fa"; // Added FaCheckCircle

const InstagramConnect = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1. Check for success signal from Backend
    if (router.query.instagram === "connected") {
      setSuccess(true);
      // Optional: Clear URL params to clean up address bar
      router.replace("/InstagramConnect", undefined, { shallow: true });
    }

    // 2. Check for error signal from Backend
    if (router.query.error) {
      setError("Failed to connect to Instagram. Please try again.");
    }
  }, [router.query]);

  const handleConnect = () => {
    // ✅ CRITICAL: Redirect to YOUR Backend, not Instagram directly.
    // The backend will generate the secure 'state' (User ID) and redirect to Instagram.
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    window.location.href = `${backendUrl}/auth/instagram`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <FaInstagram className={styles.instagramIcon} />
          <h1>Connect Your Instagram</h1>
          <p className={styles.subtitle}>
            Unlock scheduling, analytics, and AI-powered tools to grow your
            presence.
          </p>
        </div>

        {/* ✅ Success Message */}
        {success && (
          <div className={styles.successMessage} style={{ color: 'green', textAlign: 'center', margin: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FaCheckCircle /> 
            <span>Instagram Connected Successfully!</span>
          </div>
        )}

        {/* ❌ Error Message */}
        {error && <p className={styles.error} style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

        <div className={styles.benefits}>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>📅</div>
            <div>
              <h3>Schedule Posts</h3>
              <p>Plan your content calendar weeks in advance.</p>
            </div>
          </div>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>📊</div>
            <div>
              <h3>Track Performance</h3>
              <p>See which posts drive the most engagement and growth.</p>
            </div>
          </div>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>✨</div>
            <div>
              <h3>AI Caption & Hashtag Generator</h3>
              <p>Never struggle with captions again. Let AI help!</p>
            </div>
          </div>
        </div>

        <div className={styles.trustSection}>
          <p>🔒 Secure connection via Instagram’s official API</p>
          <p>🚫 We never post without your explicit approval</p>
        </div>

        {/* ✅ Updated Button Logic */}
        {!success && (
          <button 
            onClick={handleConnect} 
            className={styles.connectButton}
            style={{ cursor: 'pointer', border: 'none' }} // Ensure it looks like the previous link
          >
            <FaInstagram />
            Connect to Instagram
          </button>
        )}
        
        {success && (
           <button 
             className={styles.connectButton} 
             disabled 
             style={{ opacity: 0.7, cursor: 'not-allowed' }}
           >
             Connected
           </button>
        )}

        <div className={styles.footerNote}>
          <p>
            By connecting, you agree to our <a href="#">Terms</a> and{" "}
            <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstagramConnect;