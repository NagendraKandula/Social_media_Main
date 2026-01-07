import React, { useState, useEffect } from 'react';
import axios from '../lib/axios'; //
import styles from '../styles/Analytics.module.css'; //
import { withAuth } from '../utils/withAuth'; //
import { GetServerSideProps } from 'next';
import Link from 'next/link';

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
        const response = await axios.get('/instagram-analytics/account');
        // Ensure we are accessing the data correctly based on the service response
        setProfile(response.data.profile);
        setAccountMetrics(response.data.metrics || []);
        setPostTotals(null); 
      } else {
        const response = await axios.get('/instagram-analytics/posts-summary');
        setPostTotals(response.data);
        setProfile(null);
      }
    } catch (err: any) {
      console.error('Error fetching Instagram analytics:', err);
      setError('Failed to load data. Ensure your Instagram Business account is connected.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [viewMode]);

  return (
    <div className={styles.analyticsContainer}>
      {/* --- Platform Navigation Bar --- */}
      <nav className={styles.toggle} style={{ marginBottom: '2rem', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/Analytics"><button>YouTube</button></Link>
        
        {/* Instagram Dropdown */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <select 
            className={styles.active} 
            style={{ 
                padding: '10px 15px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                border: 'none', 
                background: '#3b82f6', 
                color: 'white',
                fontWeight: 'bold'
            }}
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'account' | 'posts')}
          >
            <option value="account" style={{color: 'black'}}>Instagram: Account Level</option>
            <option value="posts" style={{color: 'black'}}>Instagram: Post Level</option>
          </select>
        </div>

        {/* Visible Platform Placeholders */}
        <button disabled style={{ opacity: 0.5 }}>Facebook</button>
        <button disabled style={{ opacity: 0.5 }}>LinkedIn</button>
        <button disabled style={{ opacity: 0.5 }}>Twitter</button>
      </nav>

      <h1 className={styles.header}>
        {viewMode === 'account' ? '📸 Account Analytics' : '📊 Post Level Totals'}
      </h1>

      {loading && <p className={styles.message}>Loading Data...</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}

      {!loading && !error && (
        <div className={styles.statsGrid}>
          {/* Account Level Display */}
          {viewMode === 'account' && profile && (
            <>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Followers</h3>
                <p className={styles.statValue}>{profile.followers_count?.toLocaleString() || 0}</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Total Media</h3>
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

          {/* Post Level Display */}
          {viewMode === 'posts' && postTotals && (
            <>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Total Likes</h3>
                <p className={styles.statValue}>{postTotals.totalLikes?.toLocaleString() || 0}</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Total Comments</h3>
                <p className={styles.statValue}>{postTotals.totalComments?.toLocaleString() || 0}</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Total Reach</h3>
                <p className={styles.statValue}>{postTotals.totalReach?.toLocaleString() || 0}</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Total Impressions</h3>
                <p className={styles.statValue}>{postTotals.totalImpressions?.toLocaleString() || 0}</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Total Saved</h3>
                <p className={styles.statValue}>{postTotals.totalSaved?.toLocaleString() || 0}</p>
              </div>
              <div className={styles.statCard}>
                <h3 className={styles.statTitle}>Video Views</h3>
                <p className={styles.statValue}>{postTotals.totalVideoViews?.toLocaleString() || 0}</p>
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