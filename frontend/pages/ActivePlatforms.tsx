import React, { useEffect, useState } from 'react';
import LHeader from './LHeader';
import apiClient from '../lib/axios';
import styles from '../styles/ActivePlatforms.module.css';
import { FaFacebookF, FaPlus, FaUnlink, FaSyncAlt } from 'react-icons/fa';

const ActivePlatforms = () => {
  const [accounts, setAccounts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/auth/social/active-accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error("Failed to fetch active accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDisconnect = async (provider: string) => {
    if (confirm(`Are you sure you want to disconnect your ${provider} account?`)) {
      try {
        await apiClient.delete(`/auth/social/${provider}`);
        fetchAccounts(); // Refresh the list
      } catch (err) {
        alert("Failed to disconnect account.");
      }
    }
  };

  const handleConnect = (provider: string) => {
    // Redirects to your existing backend OAuth initiation route
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    window.location.href = `${backendUrl}/auth/${provider}`;
  };

  return (
    <div className={styles.container}>
      <LHeader setActivePlatform={() => {}} />
      
      <main className={styles.content}>
        <div className={styles.headerSection}>
          <h1>Social Media Connections</h1>
          <p>Manage your linked accounts and platform permissions.</p>
        </div>

        <div className={styles.platformGrid}>
          {/* Facebook Platform Card */}
          <div className={styles.card}>
            <div className={styles.platformHeader}>
              <div className={`${styles.iconWrapper} ${styles.facebookIcon}`}>
                <FaFacebookF />
              </div>
              <div className={styles.platformName}>
                <h3>Facebook</h3>
                <span>Pages & Insights</span>
              </div>
            </div>

            <div className={styles.cardBody}>
              {accounts?.facebook ? (
                <div className={styles.connectedProfile}>
                  <img 
                    src={accounts.facebook.profilePic || "/profile.png"} 
                    alt="Profile" 
                    className={styles.avatar} 
                  />
                  <div className={styles.profileInfo}>
                    <p className={styles.userName}>{accounts.facebook.name}</p>
                    <p className={styles.statusBadge}>Connected</p>
                  </div>
                </div>
              ) : (
                <p className={styles.emptyText}>No Facebook account linked.</p>
              )}
            </div>

            <div className={styles.cardFooter}>
              {accounts?.facebook ? (
                <>
                  <button 
                    onClick={() => handleConnect('facebook')} 
                    className={styles.reconnectBtn}
                    title="Refresh token"
                  >
                    <FaSyncAlt /> Reconnect
                  </button>
                  <button 
                    onClick={() => handleDisconnect('facebook')} 
                    className={styles.disconnectBtn}
                  >
                    <FaUnlink /> Disconnect
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => handleConnect('facebook')} 
                  className={styles.connectBtn}
                >
                  <FaPlus /> Connect Account
                </button>
              )}
            </div>
          </div>

          {/* You can add similar cards for Instagram, YouTube, etc. here */}
        </div>
      </main>
    </div>
  );
};

export default ActivePlatforms;