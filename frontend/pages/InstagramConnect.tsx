import React, { useState, useEffect } from "react"; // Added useEffect
import { useRouter } from "next/router"; // Added useRouter
import styles from "../styles/InstagramConnect.module.css";
import { FaInstagram } from "react-icons/fa";

const InstagramConnect = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (router.query.error) {
      setError('Failed to connect to Instagram. Please try again.');
    }
  }, [router.query]);

  const getInstagramAuthUrl = () => {
    const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
    const redirectUri = `https://0f4cac010244.ngrok-free.app/instagram-business/callback`;
    
    // --- IMPORTANT: Use the new, correct scopes ---
    const scope = 'instagram_business_content_publish,instagram_business_basic';
    
    return `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;  
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <FaInstagram className={styles.instagramIcon} />
          <h1>Connect Your Instagram</h1>
          <p className={styles.subtitle}>
            Unlock scheduling, analytics, and AI-powered tools to grow your presence.
          </p>
        </div>

        {error && <p className={styles.error}>{error}</p>} {/* Added error display */}

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

        {/* --- FIX: This is now an <a> tag to redirect the user --- */}
        <a 
          href={getInstagramAuthUrl()} 
          className={styles.connectButton}
        >
          <FaInstagram />
          Connect to Instagram
        </a>

        <div className={styles.footerNote}>
          <p>
            By connecting, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstagramConnect;