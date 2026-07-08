import React, { useEffect, useState } from 'react';
import apiClient from '../../../lib/axios';
import styles from '../../../styles/LandingCSS/Tabs/ActivePlatforms.module.css';
import {
  addNotification,
  AppNotification,
  getNotifications,
  NOTIFICATIONS_UPDATED_EVENT,
} from '../../../utils/notifications';
import {
  FaFacebookF,
  FaFire,
  FaHistory,
  FaInstagram,
  FaPlus,
  FaUnlink,
  FaSyncAlt,
  FaYoutube,
  FaAt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTwitter,
  FaLinkedin,
  FaInfoCircle,
  FaTimesCircle,
} from 'react-icons/fa';

const ACTIVE_ACCOUNTS_CACHE_KEY = 'story_active_accounts';
const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  threads: 'Threads',
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
};
const TRENDING_TOPICS = [
  'AI workflows',
  'Creator tips',
  'Short-form video',
  'Community building',
  'Product stories',
  'Behind the scenes',
  'Customer wins',
  'Industry insights',
  'Weekly recap',
];
const CONTENT_ANGLES = [
  'Turn one customer question into a useful carousel.',
  'Share a quick before-and-after transformation.',
  'Show the process behind your latest result.',
];

const formatRelativeTime = (dateString: string) => {
  const elapsed = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(1, Math.floor(elapsed / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const getDisplayNameFromEmail = (email?: string) => {
  const emailName = email?.split('@')[0]?.split(/[._-]/)[0]?.trim();
  return emailName ? emailName.charAt(0).toUpperCase() + emailName.slice(1) : 'there';
};

const getCachedAccounts = () => {
  if (typeof window === 'undefined') return null;

  const cachedAccounts = sessionStorage.getItem(ACTIVE_ACCOUNTS_CACHE_KEY);
  if (!cachedAccounts) return null;

  try {
    return JSON.parse(cachedAccounts);
  } catch {
    sessionStorage.removeItem(ACTIVE_ACCOUNTS_CACHE_KEY);
    return null;
  }
};

const ActivePlatforms = () => {
  const [accounts, setAccounts] = useState<any>(() => getCachedAccounts());
  const [loading, setLoading] = useState(() => !getCachedAccounts());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<AppNotification[]>([]);
  const [displayName, setDisplayName] = useState('there');

  const fetchAccounts = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const res = await apiClient.get('/auth/social/active-accounts');
      setAccounts(res.data);
      sessionStorage.setItem(ACTIVE_ACCOUNTS_CACHE_KEY, JSON.stringify(res.data));

      Object.entries(res.data || {}).forEach(([provider, account]: [string, any]) => {
        if (account?.needsReconnect) {
          const platformName = PLATFORM_LABELS[provider] || provider;

          addNotification({
            type: 'warning',
            title: `${platformName} session expired`,
            message: `Reconnect ${platformName} to keep publishing and scheduling posts.`,
            dedupeKey: `session-expired-${provider}`,
          });
        }
      });
    } catch (err) {
      console.error('Failed to fetch active accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts(!accounts);

    apiClient.get('/auth/profile')
      .then(({ data }) => setDisplayName(data?.fullName?.split(' ')[0] || getDisplayNameFromEmail(data?.email)))
      .catch((err) => console.error('Failed to fetch user profile:', err));

    const syncActivity = () => setRecentActivity(getNotifications());
    syncActivity();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, syncActivity);

    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, syncActivity);
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
      addNotification({
        type: 'info',
        title: `${PLATFORM_LABELS[provider] || provider} disconnected`,
        message: `${PLATFORM_LABELS[provider] || provider} was removed from your connected channels.`,
      });
      notifyHeader();
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

  const connectedCount = platforms.filter((platform) => accounts?.[platform.id] && !accounts[platform.id].needsReconnect).length;
  const sortedPlatforms = platforms
    .map((platform, index) => ({ ...platform, originalIndex: index }))
    .sort((a, b) => {
      const aConnected = accounts?.[a.id] ? 1 : 0;
      const bConnected = accounts?.[b.id] ? 1 : 0;
      return bConnected - aConnected || a.originalIndex - b.originalIndex;
    });

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.pageTitle}>Hey {displayName}, welcome back <span aria-hidden="true">👋</span></h1>
          <p>Here’s what’s happening with your social channels today.</p>
        </div>
      </section>

      {loading ? (
        <p className={styles.loadingText}>Loading connected accounts…</p>
      ) : (
        <>
          <div className={styles.dashboardTop}>
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Active platforms</h2>
                </div>
                <span>{connectedCount} connected</span>
              </div>

              <div className={styles.platformGrid}>
                {sortedPlatforms.map((p) => {
                  const account = accounts?.[p.id];
                  const needsReconnect = account?.needsReconnect;

                  return (
                    <article key={p.id} className={styles.platformCard}>
                      <div className={styles.cardBody}>
                        {account?.profilePic ? (
                          <>
                            <img
                              src={account.profilePic}
                              className={styles.avatar}
                              alt={`${p.name} profile`}
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                                event.currentTarget.nextElementSibling?.classList.remove(styles.hiddenIcon);
                              }}
                            />
                            <div className={`${styles.platformIcon} ${styles.hiddenIcon} ${p.color}`}>
                              {p.icon}
                            </div>
                          </>
                        ) : (
                          <div className={`${styles.platformIcon} ${p.color}`}>{p.icon}</div>
                        )}
                        <div className={styles.profileInfo}>
                          <p className={styles.platformName}>{p.name}</p>
                          <p className={styles.userName}>
                            {account ? getAccountName(account, p.name) : 'Not connected'}
                          </p>
                        </div>
                      </div>

                      <div className={styles.cardFooter}>
                        {account ? (
                          <>
                            <button onClick={() => handleAction(p.id, 'reconnect')} className={styles.reconnectBtn}>
                              <FaSyncAlt /> {needsReconnect ? 'Fix connection' : 'Reconnect'}
                            </button>
                            <button
                              onClick={() => handleAction(p.id, 'disconnect')}
                              className={styles.iconButton}
                              aria-label={`Disconnect ${p.name}`}
                              title={`Disconnect ${p.name}`}
                            >
                              <FaUnlink />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAction(p.id, 'connect')}
                            className={styles.connectBtn}
                            disabled={actionLoading === p.id}
                          >
                            <FaPlus /> {actionLoading === p.id ? 'Connecting…' : 'Connect'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

          </div>

          <div className={styles.insightGrid}>
            <section className={styles.insightCard}>
              <div className={styles.insightHeader}>
                <div className={styles.headingWithIcon}>
                  <span className={`${styles.panelIcon} ${styles.activityIcon}`}><FaHistory /></span>
                  <div>
                    <h2>Recent activity</h2>
                    <p>{recentActivity.length} latest account and publishing updates</p>
                  </div>
                </div>
              </div>
              <div className={`${styles.list} ${styles.activityList}`}>
                {recentActivity.length > 0 ? recentActivity.map((item) => (
                  <div
                    className={`${styles.activityRow} ${styles[`activityRow-${item.type}`]}`}
                    key={item.id}
                  >
                    <span className={`${styles.activityMarker} ${styles[`activity-${item.type}`]}`}>
                      {item.type === 'success' && <FaCheckCircle />}
                      {item.type === 'warning' && <FaExclamationTriangle />}
                      {item.type === 'error' && <FaTimesCircle />}
                      {item.type === 'info' && <FaInfoCircle />}
                    </span>
                    <div className={styles.rowContent}>
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                      {item.details && item.details.length > 0 && (
                        <div className={styles.activityDetails}>
                          {item.details.slice(0, 3).map((detail) => (
                            <span key={`${item.id}-${detail.label}`}>
                              <strong>{detail.label}</strong>
                              {detail.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <time
                      dateTime={item.createdAt}
                      title={new Date(item.createdAt).toLocaleString()}
                    >
                      {formatRelativeTime(item.createdAt)}
                    </time>
                  </div>
                )) : <p className={styles.emptyState}>Activity will appear here as you work.</p>}
              </div>
            </section>

            <section className={`${styles.insightCard} ${styles.trendsCard}`}>
              <div className={styles.insightHeader}>
                <div className={styles.headingWithIcon}>
                  <span className={`${styles.panelIcon} ${styles.trendIcon}`}><FaFire /></span>
                  <div><h2>Trending topics</h2></div>
                </div>
              </div>
              <div className={styles.topicList}>
                {TRENDING_TOPICS.map((topic, index) => (
                  <span key={topic} className={styles.topic} style={{ '--topic-index': index } as React.CSSProperties}>
                    #{topic}
                  </span>
                ))}
              </div>
              <div className={styles.trendNote}>
                <strong>Fresh directions for your next post</strong>
                <p>Curated prompts to help you start—not live trend analytics.</p>
              </div>
              <div className={styles.contentAngles}>
                <span>Content angles</span>
                {CONTENT_ANGLES.map((angle, index) => (
                  <div key={angle}>
                    <strong>{String(index + 1).padStart(2, '0')}</strong>
                    <p>{angle}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivePlatforms;
