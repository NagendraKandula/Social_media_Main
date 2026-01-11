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
  FaLinkedin 
} from 'react-icons/fa';

const ActivePlatforms = () => {
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Provider | null>(null);

  const fetchAccounts = async (silent = false) => {
  try {
    if (!silent) setLoading(true);

    const res = await apiClient.get("/auth/social/active-accounts");

    setAccounts(res.data);
    cachedAccounts = res.data; // ✅ update cache
  } catch (err) {
    console.error("Failed to fetch active accounts:", err);
  } finally {
    if (!silent) setLoading(false);
  }
};


  useEffect(() => {
  if (cachedAccounts) {
    // ✅ Instant render from cache
    setAccounts(cachedAccounts);
    setLoading(false);

    // 🔄 Background refresh
    fetchAccounts(true);
  } else {
    // First time only
    fetchAccounts();
  }
}, []);


  const notifyHeader = () => {
    window.dispatchEvent(new Event("social-accounts-updated"));
  };

  const handleAction = async (provider: string, action: 'connect' | 'disconnect'| 'reconnect') => {
    if (action === 'disconnect') {
      if (!confirm(`Disconnect ${provider}?`)) return;
      await apiClient.delete(`/auth/social/${provider}`);
      fetchAccounts();
    } else {
      try {
        await apiClient.get('/auth/profile');
      } catch (error) {
        console.error("Session refresh failed before redirect:", error);
        alert(`Unable to connect to ${provider.charAt(0).toUpperCase() + provider.slice(1)}. Please try again later.`);
        return;
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

      notifyHeader(); // ✅ sync before redirect
      window.location.href = redirectUrl;
    } catch {
      alert(`Unable to connect ${provider}`);
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
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: <FaLinkedin />, 
      color: styles.linkedinIcon 
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
                        alt={`${p.name} Profile`}
                    />
                    <div className={styles.profileInfo}>
                      <p className={styles.userName}>{accounts[p.id].name}</p>
                      
                      {/* ✅ UPDATE 1: Smart Status Badge */}
                      {accounts[p.id].needsReconnect ? (
                        <p 
                          className={styles.statusBadge} 
                          style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }}
                        >
                          Session Expired
                        </p>
                      ) : (
                        <p className={styles.statusBadge}>Connected</p>
                      )}
                      
                    </div>
                  ) : (
                    <p className={styles.emptyText}>
                      No {p.name} account linked.
                    </p>
                  )}
                </div>

              <div className={styles.cardFooter}>
                {accounts?.[p.id] ? (
                  <>
                    <button 
                      onClick={() => handleAction(p.id, 'reconnect')} 
                      className={styles.reconnectBtn}
                      // ✅ UPDATE 2: Visual Alert on Button
                      style={accounts[p.id].needsReconnect ? { border: '1px solid #ef4444', color: '#ef4444' } : {}}
                    >
                      <FaSyncAlt /> {accounts[p.id].needsReconnect ? 'Fix Connection' : 'Reconnect'}
                    </button>
                    
                    <button onClick={() => handleAction(p.id, 'disconnect')} className={styles.disconnectBtn}>
                      <FaUnlink /> Disconnect
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleAction(p.id, 'connect')} className={styles.connectBtn}>
                    <FaPlus /> Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivePlatforms;
