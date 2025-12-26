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
import styles from '../styles/Analytics.module.css';
import axios from '../lib/axios';
import { withAuth } from '../utils/withAuth';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router'; // MODIFIED: Imported useRouter
import Link from 'next/link'; // NEW: Imported Link for navigation

// --- INTERFACES ---
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
  const router = useRouter(); // NEW: Get the router instance
  const { videoId: videoIdFromUrl } = router.query; // NEW: Get videoId from the URL query

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
    // This function remains unchanged
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
      } else { // Video Analytics
        if (!videoId) {
          // Set an initial state, but don't show an error until a fetch is attempted
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
      console.error('Error fetching analytics:', err);
      setError(
        `Failed to load ${analyticsType} analytics data. Please ensure your account is connected and the Video ID is correct.`
      );
    } finally {
      setLoading(false);
    }
  };
  
  // NEW: This useEffect handles the videoId from the URL
  useEffect(() => {
    if (videoIdFromUrl) {
      setAnalyticsType('video');
      setVideoId(videoIdFromUrl as string);
    }
  }, [videoIdFromUrl]);

  // MODIFIED: Added videoId to the dependency array
  useEffect(() => {
    // Only fetch if it's channel analytics, or if it's video analytics AND a videoId is set
    if (analyticsType === 'channel' || (analyticsType === 'video' && videoId)) {
        fetchAnalytics();
    }
  }, [selectedRange, selectedYear, selectedMonth, analyticsType, videoId]);

  if (loading) return <p className={styles.message}>Loading Analytics...</p>;
  if (error) return <p className={styles.errorMessage}>{error}</p>;

  return (
    <div className={styles.analyticsContainer}>
      <h1 className={styles.header}>📊 YouTube Analytics</h1>

      {/* NEW: Link to select a video from a list */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <Link href="/VideoAnalytics" style={{ color: '#3b82f6', fontWeight: '600' }}>
          Or, select a video to see its stats
        </Link>
      </div>

      {/* --- Analytics Type Toggle --- */}
      <div className={styles.toggle}>
        <button
          className={analyticsType === 'channel' ? styles.active : ''}
          onClick={() => {
            setAnalyticsType('channel');
            setVideoId(''); // Clear videoId when switching back to channel
          }}
        >
          Channel
        </button>
        <button
          className={analyticsType === 'video' ? styles.active : ''}
          onClick={() => setAnalyticsType('video')}
        >
          Video
        </button>
      </div>

      {/* --- Filters (No changes here) --- */}
      <div className={styles.rangeSelector}>
        <select
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
              min="2000"
              max={new Date().getFullYear()}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            />
            <input
              type="number"
              min="1"
              max="12"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      {analyticsType === 'video' && (
        <div className={styles.videoInput}>
          <input
            type="text"
            placeholder="Enter YouTube Video ID"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
          />
          <button onClick={fetchAnalytics}>Fetch Video Analytics</button>
        </div>
      )}

      {/* --- Summary Stats & Chart (No changes here) --- */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3 className={styles.statTitle}>Total Views</h3>
          <p className={styles.statValue}>{summary.totalViews?.toLocaleString()}</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statTitle}>Total Likes</h3>
          <p className={styles.statValue}>{summary.totalLikes?.toLocaleString()}</p>
        </div>
        <div className={styles.statCard}>
          <h3 className={styles.statTitle}>Total Comments</h3>
          <p className={styles.statValue}>{summary.totalComments?.toLocaleString()}</p>
        </div>
        {analyticsType === 'channel' ? (
          <div className={styles.statCard}>
            <h3 className={styles.statTitle}>Subscribers Gained</h3>
            <p className={styles.statValue}>{summary.totalSubscribers?.toLocaleString()}</p>
          </div>
        ) : (
          <>
            <div className={styles.statCard}>
              <h3 className={styles.statTitle}>Minutes Watched</h3>
              <p className={styles.statValue}>{summary.totalEstimatedMinutesWatched?.toLocaleString()}</p>
            </div>
            <div className={styles.statCard}>
              <h3 className={styles.statTitle}>Avg. View Duration</h3>
              <p className={styles.statValue}>{summary.totalAverageViewDuration?.toFixed(2)}s</p>
            </div>
          </>
        )}
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={analyticsData}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="views"
              stroke="#8884d8"
              fillOpacity={1}
              fill="url(#colorViews)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(async (context) => {
  return { props: {} };
});

export default Analytics;