import React, { useState, useEffect } from 'react';
import apiClient from '../lib/axios';
import styles from '../styles/Analytics.module.css';
import { withAuth } from '../utils/withAuth';
import { GetServerSideProps } from 'next';
import Link from 'next/link';

// ---------- TYPES ----------
interface ProfileData {
  id: string;
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

// ---------- COMPONENT ----------
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
        const res = await apiClient.get('/instagram-analytics/account');
        setProfile(res.data.profile);
        setAccountMetrics(res.data.metrics ?? []);
        setPostTotals(null);
      } else {
        const res = await apiClient.get('/instagram-analytics/posts-summary');
        setPostTotals(res.data);
        setProfile(null);
        setAccountMetrics([]);
      }
    } catch (err: any) {
      console.error('Instagram analytics error:', err);
      setError(
        err?.response?.data?.message ||
          'Failed to load Instagram analytics. Please connect Instagram.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [viewMode]);

  // ---------- UI ----------
  return (
    <div className={styles.analyticsContainer}>
      {/* PLATFORM SWITCH */}
      <nav className={styles.toggle}>
        <Link href="/Analytics">
          <button>YouTube</button>
        </Link>

        <select
          className={styles.active}
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as 'account' | 'posts')}
        >
          <option value="account">Instagram: Account Level</option>
          <option value="posts">Instagram: Post Level</option>
        </select>

        <button disabled>Facebook</button>
        <button disabled>LinkedIn</button>
        <button disabled>Twitter</button>
      </nav>

      <h1 className={styles.header}>
        {viewMode === 'account'
          ? '📸 Instagram Account Analytics'
          : '📊 Instagram Post Totals'}
      </h1>

      {loading && <p className={styles.message}>Loading analytics…</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}

      {!loading && !error && (
        <div className={styles.statsGrid}>
          {/* ACCOUNT LEVEL */}
          {viewMode === 'account' && profile && (
            <>
              <div className={styles.statCard}>
                <h3>Followers</h3>
                <p>{profile.followers_count.toLocaleString()}</p>
              </div>

              <div className={styles.statCard}>
                <h3>Total Media</h3>
                <p>{profile.media_count.toLocaleString()}</p>
              </div>

              {accountMetrics.map((m) => (
                <div key={m.name} className={styles.statCard}>
                  <h3>{m.title || m.name.replace(/_/g, ' ')}</h3>
                  <p>{m.total_value?.value?.toLocaleString() ?? 0}</p>
                </div>
              ))}
            </>
          )}

          {/* POST LEVEL TOTALS */}
          {viewMode === 'posts' && postTotals && (
            <>
              <Stat title="Total Likes" value={postTotals.totalLikes} />
              <Stat title="Total Comments" value={postTotals.totalComments} />
              <Stat title="Total Reach" value={postTotals.totalReach} />
              <Stat title="Total Impressions" value={postTotals.totalImpressions} />
              <Stat title="Total Saved" value={postTotals.totalSaved} />
              <Stat title="Video Views / Plays" value={postTotals.totalVideoViews} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ---------- SMALL HELPER ----------
const Stat = ({ title, value }: { title: string; value: number }) => (
  <div className={styles.statCard}>
    <h3>{title}</h3>
    <p>{value.toLocaleString()}</p>
  </div>
);

// ---------- AUTH ----------
export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
});

export default InstagramAnalytics;
