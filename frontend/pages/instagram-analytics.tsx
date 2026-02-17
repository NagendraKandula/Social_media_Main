import React, { useState, useEffect } from 'react';
import apiClient from '../lib/axios'; //
import styles from '../styles/Instagram-analytics.module.css'; //
import { withAuth } from '../utils/withAuth'; //
import { GetServerSideProps } from 'next';

// --- INTERFACES ---
interface ProfileData {
  id: string;
  name: string;
  username: string;
  followers_count: number;
  media_count: number;
}

interface Metric {
  name: string;
  title?: string;
  total_value: { value: number };
}

interface PostTotals {
  totalLikes: number;
  totalComments: number;
  totalImpressions: number;
  totalReach: number;
  totalSaved: number;
  totalVideoViews: number;
}

const InstagramAnalytics: React.FC = () => {
  const [viewMode, setViewMode] = useState<'account' | 'posts'>('account');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [accountMetrics, setAccountMetrics] = useState<Metric[]>([]);
  const [postTotals, setPostTotals] = useState<PostTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      if (viewMode === 'account') {
        // Calls Backend/src/analytics/instagram-analytics/instagram-analytics.controller.ts -> getAccountStats
        const response = await apiClient.get('/instagram-analytics/account');
        setProfile(response.data.profile);
        setAccountMetrics(response.data.metrics || []);
        setPostTotals(null); 
      } else {
        // Calls Backend/src/analytics/instagram-analytics/instagram-analytics.controller.ts -> getPostsSummary
        const response = await apiClient.get('/instagram-analytics/posts-summary');
        setPostTotals(response.data);
        setProfile(null);
      }
    } catch (err: any) {
      console.error('Error fetching Instagram analytics:', err);
      setError('Ensure your Instagram Business account is connected.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [viewMode]);

  return (
    <div className={styles.analyticsContainer}>
      {/* --- Platform Header (Only Instagram) --- */}
      <div className={styles.platformHeader} style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button 
          className={styles.active} 
          style={{ 
            background: '#E1306C', // Instagram Brand Color
            color: 'white',
            padding: '12px 30px',
            borderRadius: '12px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            border: 'none'
          }}
        >
          Instagram Analytics
        </button>
      </div>

      {/* --- Sub-Level Toggle --- */}
      <div className={styles.toggle} style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '3rem' }}>
        <button
          className={viewMode === 'account' ? styles.active : ''}
          onClick={() => setViewMode('account')}
          style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Account Level
        </button>
        <button
          className={viewMode === 'posts' ? styles.active : ''}
          onClick={() => setViewMode('posts')}
          style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Post Level
        </button>
      </div>

      {loading && <p className={styles.message}>Loading data...</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}

      {!loading && !error && (
        <div className={styles.statsGrid}>
          {/* Account Level Analytics */}
          {viewMode === 'account' && profile && (
            <>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Followers</h3>
                <p className={styles.statValue}>{profile.followers_count?.toLocaleString() || 0}</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Posts</h3>
                <p className={styles.statValue}>{profile.media_count?.toLocaleString() || 0}</p>
              </div>
              {accountMetrics.map((m) => (
                <div key={m.name} className={styles.statCard}>
                  <h3 className={styles.statTitle}>{m.title || m.name.replace(/_/g, ' ')}</h3>
                  <p className={styles.statValue}>{m.total_value?.value?.toLocaleString() || 0}</p>
                </div>
              ))}
            </>
          )}

          {/* Post Level Analytics */}
          {viewMode === 'posts' && postTotals && (
            <>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Total Likes</h3>
                <p className={styles.statValue}>{postTotals.totalLikes?.toLocaleString()}</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Total Comments</h3>
                <p className={styles.statValue}>{postTotals.totalComments?.toLocaleString()}</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Total Reach</h3>
                <p className={styles.statValue}>{postTotals.totalReach?.toLocaleString()}</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Impressions</h3>
                <p className={styles.statValue}>{postTotals.totalImpressions?.toLocaleString()}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
});

export default InstagramAnalytics;