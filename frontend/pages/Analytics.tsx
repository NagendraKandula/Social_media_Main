// frontend/pages/Analytics.tsx
import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import styles from '../styles/analytics.module.css';
import axios from '../lib/axios';
import { withAuth } from '../utils/withAuth';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface AnalyticsRow {
  day: string;
  views: number;
  likes: number;
  comments: number;
  subscribers?: number; 
  estimatedMinutesWatched?: number;
  averageViewDuration?: number;
}

interface SummaryTotals {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalSubscribers?: number;
  totalEstimatedMinutesWatched?: number;
  totalAverageViewDuration?: number;
}

const Analytics: React.FC = () => {
  const router = useRouter();
  const { videoId: videoIdFromUrl } = router.query;

  const [analyticsType, setAnalyticsType] = useState<'channel' | 'video'>('channel');
  const [videoId, setVideoId] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsRow[]>([]);
  const [summary, setSummary] = useState<SummaryTotals>({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalSubscribers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedRange, setSelectedRange] = useState<'7d' | '28d' | '90d' | '365d' | 'lifetime' | 'month'>('7d');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      if (analyticsType === 'channel') {
        const params: Record<string, any> = { range: selectedRange };
        if (selectedRange === 'month') {
          params.year = selectedYear;
          params.month = selectedMonth;
        }

        const response = await axios.get('/youtube-analytics', { params });

        const formattedData: AnalyticsRow[] = response.data.rows.map(
          (row: (string | number)[]) => ({
            day: new Date(row[0] as string).toLocaleDateString(),
            views: row[1] as number,
            likes: row[2] as number,
            comments: row[3] as number,
            subscribers: row[4] as number,
          })
        );

        const totals: SummaryTotals = formattedData.reduce(
          (acc: SummaryTotals, row: AnalyticsRow) => {
            acc.totalViews += row.views;
            acc.totalLikes += row.likes;
            acc.totalComments += row.comments;
            acc.totalSubscribers = (acc.totalSubscribers || 0) + (row.subscribers || 0);
            return acc;
          },
          { totalViews: 0, totalLikes: 0, totalComments: 0, totalSubscribers: 0 }
        );

        setAnalyticsData(formattedData);
        setSummary(totals);
      } else {
        if (!videoId) {
          setAnalyticsData([]);
          setSummary({ totalViews: 0, totalLikes: 0, totalComments: 0 });
          setLoading(false);
          return;
        }

        const response = await axios.get('/youtube-analytics/video', {
          params: { videoId, range: selectedRange },
        });

        const formattedData: AnalyticsRow[] = response.data.rows.map(
          (row: (string | number)[]) => ({
            day: new Date(row[0] as string).toLocaleDateString(),
            views: row[1] as number,
            likes: row[2] as number,
            comments: row[3] as number,
            estimatedMinutesWatched: row[4] as number,
            averageViewDuration: row[5] as number,
          })
        );

        setAnalyticsData(formattedData);
        setSummary(response.data.totals);
      }

      setError('');
    } catch (err) {
      setError(`Failed to load ${analyticsType} analytics data.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoIdFromUrl) {
      setAnalyticsType('video');
      setVideoId(videoIdFromUrl as string);
    }
  }, [videoIdFromUrl]);

  useEffect(() => {
    if (analyticsType === 'channel' || (analyticsType === 'video' && videoId)) {
      fetchAnalytics();
    }
  }, [selectedRange, selectedYear, selectedMonth, analyticsType, videoId]);

  if (loading) return <p className={styles.message}>Loading Analytics...</p>;
  if (error) return <p className={styles.errorMessage}>{error}</p>;

  return (
    <div className={styles.analyticsContainer}>
      <h1 className={styles.header}>📊 YouTube Analytics</h1>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <Link href="/VideoAnalytics">
          Or, select a video to see its stats
        </Link>
      </div>

      {/* Toggle */}
      <div className={styles.toggle}>
        <button onClick={() => { setAnalyticsType('channel'); setVideoId(''); }}>
          Channel
        </button>
        <button onClick={() => setAnalyticsType('video')}>
          Video
        </button>
      </div>

      {/* Filters */}
      <div className={styles.rangeSelector}>
        <select
          aria-label="Select Range"
          value={selectedRange}
          onChange={(e) => setSelectedRange(e.target.value as any)}
        >
          <option value="7d">Last 7 Days</option>
          <option value="28d">Last 28 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="365d">Last 365 Days</option>
          {analyticsType === 'channel' && <option value="month">Specific Month</option>}
          {analyticsType === 'channel' && <option value="lifetime">Lifetime</option>}
        </select>

        {selectedRange === 'month' && analyticsType === 'channel' && (
          <div className={styles.monthSelector}>
            <input
              type="number"
              aria-label="Year"
              placeholder="Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            />

            <input
              type="number"
              aria-label="Month"
              placeholder="Month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      {/* Video Input */}
      {analyticsType === 'video' && (
        <div className={styles.videoInput}>
          <input
            type="text"
            placeholder="Enter YouTube Video ID"
            aria-label="YouTube Video ID"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
          />
          <button onClick={fetchAnalytics}>Fetch Video Analytics</button>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Views</h3>
          <p>{summary.totalViews?.toLocaleString()}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Total Likes</h3>
          <p>{summary.totalLikes?.toLocaleString()}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Total Comments</h3>
          <p>{summary.totalComments?.toLocaleString()}</p>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={analyticsData}>
            <XAxis dataKey="day" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Area type="monotone" dataKey="views" stroke="#8884d8" fill="#8884d8" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
});

export default Analytics;