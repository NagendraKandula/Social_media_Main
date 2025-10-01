import React from "react";
import styles from "../styles/TwitterConnect.module.css";
import { FaTwitter } from "react-icons/fa";
import Link from "next/link";


const TwitterConnect = () => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <FaTwitter className={styles.twitterIcon} />
          <h1>Connect Your Twitter Account</h1>
          <p className={styles.subtitle}>
            Schedule tweets, track engagement, and grow your audience — all from one dashboard.
          </p>
        </div>

        <div className={styles.benefits}>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>🐦</div>
            <div>
              <h3>Schedule Tweets</h3>
              <p>Plan threads, announcements, and daily tweets ahead of time.</p>
            </div>
          </div>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>📈</div>
            <div>
              <h3>Track Impressions & Likes</h3>
              <p>See what content resonates and optimize your strategy.</p>
            </div>
          </div>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>🤖</div>
            <div>
              <h3>AI-Powered Tweet Ideas</h3>
              <p>Get suggestions based on trending topics and your niche.</p>
            </div>
          </div>
        </div>

        <div className={styles.trustSection}>
          <p>🔒 Secure connection via Twitter’s official API</p>
          <p>🚫 We never tweet without your approval</p>
        </div>

        <div className={styles.buttonGroup}>
  <button className={styles.connectButton}>
    <FaTwitter />
    Connect to Twitter
  </button>

  {/* Redirect to TwitterPost page */}
  <Link href="/TwitterPost" passHref>
    <button className={styles.dashboardButton}>
      Go to Twitter Dashboard
    </button>
  </Link>
</div>
        <div className={styles.footerNote}>
          <p>
            By connecting, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TwitterConnect;