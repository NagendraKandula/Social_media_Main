import React, { useEffect, useState } from 'react';
import LHeader from './LHeader';
import apiClient from '../lib/axios';
import styles from '../styles/ActivePlatforms.module.css';
import { 
  FaFacebookF, 
  FaInstagram, 
  FaPlus, 
  FaUnlink, 
  FaSyncAlt, 
  FaYoutube, 
  FaAt, 
  FaTwitter, 
  FaLinkedin // ✅ Added LinkedIn Import
} from 'react-icons/fa';

const ActivePlatforms = () => {
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Provider | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/auth/social/active-accounts");
      setAccounts(res.data);
    } catch (err) {
      console.error("Failed to fetch active accounts:", err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { fetchAccounts(); }, []);

  const handleAction = async (provider: Provider, action: Action) => {
    if (action === "disconnect") {
      const confirmed = window.confirm(`Disconnect ${provider}?`);
      if (!confirmed) return;

      try {
        setActionLoading(provider);
        await apiClient.delete(`/auth/social/${provider}`);
        await fetchAccounts();
      } catch (err) {
        console.error(`Failed to disconnect ${provider}:`, err);
        alert(`Unable to disconnect ${provider}. Please try again.`);
      } finally {
        setActionLoading(null);
      }
      return;
    }

    try {
      setActionLoading(provider);
      await apiClient.get("/auth/profile");

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const redirectUrl =
        action === "reconnect"
          ? `${backendUrl}/auth/${provider}?reconnect=true`
          : `${backendUrl}/auth/${provider}`;

      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Session validation failed:", error);
      alert(
        `Unable to connect to ${
          provider.charAt(0).toUpperCase() + provider.slice(1)
        }. Please try again later.`
      );
      setActionLoading(null);
    }
  };

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: <FaFacebookF />, color: styles.facebookIcon },
    { id: 'instagram', name: 'Instagram', icon: <FaInstagram />, color: styles.instagramIcon },
    { id: 'youtube', name: 'YouTube', icon: <FaYoutube/>, color: styles.youtubeIcon },
    { id: 'threads', name: 'Threads', icon: <FaAt />, color: styles.threadsIcon },
    { 
      id: 'twitter', 
      name: 'X (Twitter)', 
      icon: <FaTwitter />, 
      color: styles.twitterIcon 
    },
    // ✅ Added LinkedIn Platform Object
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: <FaLinkedin />, 
      color: styles.linkedinIcon // Make sure to add this class in your CSS
    }
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Social Media Connections</h1>

      {loading ? (
        <p className={styles.loadingText}>Loading connected accounts…</p>
      ) : (
        <div className={styles.platformGrid}>
          {platforms.map((p) => {
            const connected = accounts?.[p.id];
            const isBusy = actionLoading === p.id;

              <div className={styles.cardBody}>
                {accounts?.[p.id] ? (
                  <div className={styles.connectedProfile}>
                    <img 
                        src={accounts[p.id].profilePic || "/profile.png"} 
                        className={styles.avatar} 
                        onError={(e) => (e.currentTarget.src = '/profile.png')}
                    />
                    <div className={styles.profileInfo}>
                      <p className={styles.userName}>{accounts[p.id].name}</p>
                      <p className={styles.statusBadge}>Connected</p>
                    </div>
                  </div>
                  <h3 className={styles.platformName}>{p.name}</h3>
                </div>

                <div className={styles.cardBody}>
                  {connected ? (
                    <div className={styles.connectedProfile}>
                      <img
                        src={connected.profilePic || "/profile.png"}
                        alt={connected.name}
                        className={styles.avatar}
                      />
                      <div className={styles.profileInfo}>
                        <p className={styles.userName}>{connected.name}</p>
                        <span className={styles.statusBadge}>Connected</span>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.emptyText}>
                      No {p.name} account linked.
                    </p>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  {connected ? (
                    <>
                      <button
                        onClick={() => handleAction(p.id, "reconnect")}
                        disabled={isBusy}
                        className={styles.reconnectBtn}
                      >
                        <FaSyncAlt />
                        {isBusy ? "Reconnecting..." : "Reconnect"}
                      </button>

                      <button
                        onClick={() => handleAction(p.id, "disconnect")}
                        disabled={isBusy}
                        className={styles.disconnectBtn}
                      >
                        <FaUnlink />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleAction(p.id, "connect")}
                      disabled={isBusy}
                      className={styles.connectBtn}
                    >
                      <FaPlus />
                      {isBusy ? "Connecting..." : "Connect"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivePlatforms;
