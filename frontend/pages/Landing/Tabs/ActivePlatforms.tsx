import React, { useEffect, useState } from 'react';
import apiClient from '../../../lib/axios';
import styles from '../../../styles/LandingCSS/Tabs/ActivePlatforms.module.css';
import {
  FaFacebookF,
  FaInstagram,
  FaPlus,
  FaUnlink,
  FaSyncAlt,
  FaYoutube,
  FaAt,
  FaTwitter,
  FaLinkedin,
} from 'react-icons/fa';

const ActivePlatforms = () => {
  const [accounts, setAccounts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/auth/social/active-accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error('Failed to fetch active accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const notifyHeader = () => {
    window.dispatchEvent(new Event('social-accounts-updated'));
  };

  const handleAction = async (
    provider: string,
    action: 'connect' | 'disconnect' | 'reconnect'
  ) => {
    if (action === 'disconnect') {
      if (!confirm(`Disconnect ${provider}?`)) return;
      await apiClient.delete(`/auth/social/${provider}`);
      fetchAccounts();
      return;
    }

    try {
      setActionLoading(provider);
      await apiClient.get('/auth/profile');

      //const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const redirectUrl =
        action === 'reconnect'
          ? `/api/auth/${provider}?reconnect=true`
          : `/api/auth/${provider}`;

      notifyHeader();
      window.location.href = redirectUrl;
    } catch (err) {
      alert(`Unable to connect ${provider}`);
    } finally {
      setActionLoading(null);
    }
  };

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: <FaFacebookF />, color: styles.facebookIcon },
    { id: 'instagram', name: 'Instagram', icon: <FaInstagram />, color: styles.instagramIcon },
    { id: 'youtube', name: 'YouTube', icon: <FaYoutube />, color: styles.youtubeIcon },
    { id: 'threads', name: 'Threads', icon: <FaAt />, color: styles.threadsIcon },
    { id: 'twitter', name: 'X (Twitter)', icon: <FaTwitter />, color: styles.twitterIcon },
    { id: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin />, color: styles.linkedinIcon },
  ];

  const getAccountName = (account: any, fallback: string) =>
    account?.name || account?.username || `${fallback} User`;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Social Media Connections</h1>

      {loading ? (
        <p className={styles.loadingText}>Loading connected accounts…</p>
      ) : (
        <div className={styles.platformGrid}>
          {platforms.map((p) => (
            <div key={p.id} className={styles.platformCard}>
              <div className={styles.cardBody}>
                {accounts?.[p.id] ? (
                  <div className={styles.connectedProfile}>
                    {accounts[p.id].profilePic ? (
                      <img
                        src={accounts[p.id].profilePic}
                        className={styles.avatar}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove(styles.hiddenIcon);
                        }}
                        alt={`${p.name} Profile`}
                      />
                    ) : null}

                    <div
                      className={`${styles.platformIcon} ${styles.connectedIconFallback} ${p.color} ${
                        accounts[p.id].profilePic ? styles.hiddenIcon : ''
                      }`}
                    >
                      {p.icon}
                    </div>

                    <div className={styles.profileInfo}>
  <p className={styles.userName}>
    {getAccountName(accounts[p.id], p.name)}
  </p>

  <p className={styles.platformName}>
    {p.name}
  </p>

  {accounts[p.id].needsReconnect ? (
                        <p
                          className={styles.statusBadge}
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            border: '1px solid #fca5a5',
                          }}
                        >
                          Session Expired
                        </p>
                      ) : (
                        <p className={styles.statusBadge}>Connected</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.connectedProfile}>
                    <div className={`${styles.platformIcon} ${p.color}`}>
                      {p.icon}
                    </div>

                    <div className={styles.profileInfo}>
                      <p className={styles.userName}>No username</p>

                      <p className={styles.platformName}>
                        {p.name}
                      </p>

                      <p className={`${styles.statusBadge} ${styles.notConnectedBadge}`}>
                        Not Connected
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.cardFooter}>
                {accounts?.[p.id] ? (
                  <>
                    <button
                      onClick={() => handleAction(p.id, 'reconnect')}
                      className={styles.reconnectBtn}
                    >
                      <FaSyncAlt />{' '}
                      {accounts[p.id].needsReconnect ? 'Fix Connection' : 'Reconnect'}
                    </button>

                    <button
                      onClick={() => handleAction(p.id, 'disconnect')}
                      className={styles.disconnectBtn}
                    >
                      <FaUnlink /> Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleAction(p.id, 'connect')}
                    className={styles.connectBtn}
                    disabled={actionLoading === p.id}
                  >
                    <FaPlus /> {actionLoading === p.id ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivePlatforms;
