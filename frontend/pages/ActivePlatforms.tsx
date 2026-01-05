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
  
  useEffect(() => { fetchAccounts(); }, []);

  const handleAction = async (provider: string, action: 'connect' | 'disconnect'| 'reconnect') => {
    if (action === 'disconnect') {
      if (!confirm(`Disconnect ${provider}?`)) return;
      await apiClient.delete(`/auth/social/${provider}`);
      fetchAccounts();
    } else {
      try{
        await apiClient.get('/auth/profile');
      }
      catch (error) {
        console.error("Session refresh failed before redirect:", error);
        alert(`Unable to connect to ${provider.charAt(0).toUpperCase() + provider.slice(1)}. Please try again later.`);
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      // Logic: If action is 'reconnect', add the query parameter to bypass the backend freeze
      const url = action === 'reconnect' 
        ? `${backendUrl}/auth/${provider}?reconnect=true` 
        : `${backendUrl}/auth/${provider}`;
        
      window.location.href = url;
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
      <LHeader setActivePlatform={() => {}} />
      <main className={styles.content}>
        <h1>Social Media Connections</h1>
        <div className={styles.platformGrid}>
          {platforms.map((p) => (
            <div key={p.id} className={styles.card}>
              <div className={styles.platformHeader}>
                <div className={`${styles.iconWrapper} ${p.color}`}>{p.icon}</div>
                <div className={styles.platformName}><h3>{p.name}</h3></div>
              </div>

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
                ) : (
                  <p className={styles.emptyText}>No {p.name} account linked.</p>
                )}
              </div>

              <div className={styles.cardFooter}>
                {accounts?.[p.id] ? (
                  <>
                    <button onClick={() => handleAction(p.id, 'reconnect')} className={styles.reconnectBtn}><FaSyncAlt /> Reconnect</button>
                    <button onClick={() => handleAction(p.id, 'disconnect')} className={styles.disconnectBtn}><FaUnlink /> Disconnect</button>
                  </>
                ) : (
                  <button onClick={() => handleAction(p.id, 'connect')} className={styles.connectBtn}><FaPlus /> Connect</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ActivePlatforms;