import React, { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import axios from '../lib/axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import styles from '../styles/Analytics.module.css';
import { withAuth } from '../utils/withAuth';

const FacebookAnalytics = () => {
  const [viewState, setViewState] = useState<'initial' | 'selecting' | 'viewing'>('initial');
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Step 1: User clicks "Get Analytics"
  const handleStartAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/facebook/pages');
      setPages(res.data);
      setViewState('selecting');
    } catch (err) {
      console.error("Failed to load pages", err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: User selects a page from the list
  const handlePageClick = async (pageId: string) => {
    setSelectedPage(pageId);
    setLoading(true);
    try {
      const res = await axios.get(`/facebook-analytics/details/${pageId}`);
      setData(res.data);
      setViewState('viewing');
    } catch (err) {
      console.error("Failed to fetch matrix", err);
    } finally {
      setLoading(false);
    }
  };

  // UI for Initial Screen
  if (viewState === 'initial') {
    return (
      <div className={styles.centeredContainer}>
        <h1>🔵 Facebook Analytics</h1>
        <p>Connect and analyze your Facebook Page performance.</p>
        <button onClick={handleStartAnalytics} className={styles.mainButton}>
          {loading ? 'Loading...' : 'Get Analytics'}
        </button>
      </div>
    );
  }

  // UI for Page Selection Screen
  if (viewState === 'selecting') {
    return (
      <div className={styles.analyticsContainer}>
        <h2>Select a Page to Analyze</h2>
        <div className={styles.pageGrid}>
          {pages.map(page => (
            <div key={page.id} className={styles.pageCard} onClick={() => handlePageClick(page.id)}>
              <h3>{page.name}</h3>
              <button className={styles.selectButton}>View Matrix</button>
            </div>
          ))}
        </div>
        <button onClick={() => setViewState('initial')} className={styles.backButton}>Back</button>
      </div>
    );
  }

  // UI for the Analytics Matrix
  return (
    <div className={styles.analyticsContainer}>
      <div className={styles.headerSection}>
        <button onClick={() => setViewState('selecting')} className={styles.backButton}>← Switch Page</button>
        <h1>Matrix: {pages.find(p => p.id === selectedPage)?.name}</h1>
      </div>

      {loading ? (
        <div className={styles.loading}>Updating Matrix Data...</div>
      ) : (
        <>
          {/* 1. Metric Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span>Followers</span>
              <h2>{data?.profile?.followers_count?.toLocaleString() || 0}</h2>
            </div>
            <div className={styles.statCard}>
              <span>Fan Count (Likes)</span>
              <h2>{data?.profile?.fan_count?.toLocaleString() || 0}</h2>
            </div>
          </div>

          {/* 2. Charts */}
          <div className={styles.chartSection}>
            <h3>Page Views & Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.metrics?.find((m: any) => m.name === 'page_views_total')?.values}>
                <XAxis dataKey="end_time" tickFormatter={(t) => t.split('T')[0]} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#1877f2" fill="#1877f2" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 3. Recent Posts Table */}
          <div className={styles.tableSection}>
            <h3>Recent Post Analytics</h3>
            <table className={styles.analyticsTable}>
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Likes</th>
                  <th>Comments</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentPosts?.map((post: any) => (
                  <tr key={post.id}>
                    <td>{post.message?.substring(0, 40)}...</td>
                    <td>{post.likes?.summary?.total_count || 0}</td>
                    <td>{post.comments?.summary?.total_count || 0}</td>
                    <td>{new Date(post.created_time).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default FacebookAnalytics;

export const getServerSideProps: GetServerSideProps = withAuth(async (context) => {
  return { props: {} };
});