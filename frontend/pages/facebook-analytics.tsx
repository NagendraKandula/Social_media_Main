import React, { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import axios from '../lib/axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import styles from '../styles/Analytics.module.css';
import { withAuth } from '../utils/withAuth';

const FacebookAnalytics = () => {
  const router = useRouter();
  const [viewState, setViewState] = useState<'initial' | 'selecting' | 'viewing' | 'not_connected'>('initial');
  const [activePlatform, setActivePlatform] = useState<'facebook' | 'instagram' | null>(null);
  
  // New State for Instagram Sub-Tabs
  const [igViewTab, setIgViewTab] = useState<'account' | 'posts'>('account');
  
  // Data States
  const [fbPages, setFbPages] = useState<any[]>([]);
  const [selectedFbPage, setSelectedFbPage] = useState<any>(null);
  const [fbData, setFbData] = useState<any>(null);
  
  const [igData, setIgData] = useState<any>(null);
  const [igSummary, setIgSummary] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Check Connection & Load Pages
  const handleStartAnalytics = async () => {
    setLoading(true);
    setError('');
    
    try {
      const fbRes = await axios.get('/facebook/pages');
      
      if (fbRes.data && fbRes.data.length > 0) {
        setFbPages(fbRes.data);
        
        try {
          const igRes = await axios.get('/instagram-analytics-via-fb/account');
          setIgData(igRes.data);
        } catch (igErr) {
          console.warn("No Instagram Business account linked.");
        }
        
        setViewState('selecting');
      } else {
        setViewState('not_connected');
      }
    } catch (err: any) {
      console.error("Failed to load accounts", err);
      setViewState('not_connected');
    } finally {
      setLoading(false);
    }
  };

  // Step 2a: Facebook Matrix
  const handleFbPageClick = async (page: any) => {
    setSelectedFbPage(page);
    setActivePlatform('facebook');
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/facebook-analytics/details/${page.id}`);
      setFbData(res.data);
      setViewState('viewing');
    } catch (err) {
      console.error("Failed to fetch FB matrix", err);
      setError('Could not load Facebook analytics.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: Instagram Matrix
  const handleIgClick = async () => {
    setActivePlatform('instagram');
    setIgViewTab('account'); // Default to account level when clicked
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/instagram-analytics-via-fb/posts-summary');
      setIgSummary(res.data);
      setViewState('viewing');
    } catch (err) {
      console.error("Failed to fetch IG matrix", err);
      setError('Could not load Instagram analytics.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely extract IG Account metrics
  const getIgAccountMetric = (metricName: string) => {
    if (!igData?.metrics) return '0';
    const metric = igData.metrics.find((m: any) => m.name === metricName);
    // Graph API might return total_value or an array of values depending on the query
    const val = metric?.total_value?.value ?? metric?.values?.[0]?.value ?? 0;
    return val.toLocaleString();
  };

  // --- UI: Initial Screen ---
  if (viewState === 'initial') {
    return (
      <div className={styles.centeredContainer}>
        <h1>🔵 Social Media Analytics</h1>
        <p>Analyze Facebook Pages and linked Instagram Business accounts.</p>
        <button onClick={handleStartAnalytics} className={styles.mainButton}>
          {loading ? 'Checking Connection...' : 'Get Analytics'}
        </button>
      </div>
    );
  }

  // --- UI: Not Connected Pop-up ---
  if (viewState === 'not_connected') {
    return (
      <div className={styles.centeredContainer}>
        <div className={styles.errorBox} style={{ padding: '3rem', maxWidth: '500px', backgroundColor: '#fff', border: '1px solid #e4e6eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <img src="/facebook.png" alt="Facebook" style={{ width: '60px', marginBottom: '1rem' }} />
          <h2 style={{ color: '#1c1e21', marginBottom: '1rem' }}>Account Not Connected</h2>
          <p style={{ color: '#65676b', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Please connect your Facebook account in the Active Platforms section before viewing analytics.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => router.push('/ActivePlatforms')} className={styles.mainButton}>
              Go to Active Platforms
            </button>
            <button onClick={() => setViewState('initial')} className={styles.backButton} style={{ position: 'relative', margin: 0 }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- UI: Selection Screen ---
  if (viewState === 'selecting') {
    return (
      <div className={styles.analyticsContainer}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Select an Account to Analyze</h2>
        {error && <p className={styles.errorText}>{error}</p>}

        {/* Facebook Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <img src="/facebook.png" alt="FB" style={{ width: '30px' }} />
          <h3 style={{ margin: 0 }}>Facebook Pages</h3>
        </div>
        
        <div className={styles.pageGrid} style={{ marginBottom: '3rem' }}>
          {fbPages.map(page => (
            <div key={page.id} className={styles.pageCard}>
              <img src={page.picture?.data?.url || '/facebook.png'} alt={page.name} className={styles.pageProfilePic} />
              <h3>{page.name}</h3>
              <p style={{ color: '#65676b', fontSize: '0.9rem' }}>Page ID: {page.id}</p>
              <button className={styles.selectButton} onClick={() => handleFbPageClick(page)}>
                {loading && activePlatform === 'facebook' && selectedFbPage?.id === page.id ? 'Loading...' : 'View Matrix'}
              </button>
            </div>
          ))}
        </div>

        {/* Instagram Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <img src="/instagram.png" alt="IG" style={{ width: '30px' }} />
          <h3 style={{ margin: 0 }}>Instagram Business</h3>
        </div>

        <div className={styles.pageGrid}>
          {igData ? (
            <div className={styles.pageCard} style={{ borderColor: '#E1306C' }}>
              <img src={igData.profile?.profile_picture_url || '/instagram.png'} alt="IG Profile" className={styles.pageProfilePic} style={{ borderColor: '#E1306C' }} />
              <h3>@{igData.profile?.username || igData.profile?.name}</h3>
              <p style={{ color: '#65676b', fontSize: '0.9rem' }}>Business Account</p>
              <button className={styles.selectButton} style={{ backgroundColor: '#fff0f5', color: '#E1306C' }} onClick={handleIgClick}>
                {loading && activePlatform === 'instagram' ? 'Loading...' : 'View Matrix'}
              </button>
            </div>
          ) : (
            <div className={styles.errorBox} style={{ padding: '1.5rem', marginTop: '0' }}>
              <p>No Instagram Business Account linked to your Facebook.</p>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <button onClick={() => setViewState('initial')} className={styles.backButton} style={{ position: 'relative' }}>Back to Start</button>
        </div>
      </div>
    );
  }

  // --- UI: Matrix Dashboard ---
  return (
    <div className={styles.analyticsContainer}>
      <div className={styles.headerSection}>
        <button onClick={() => setViewState('selecting')} className={styles.backButton}>← Switch Account</button>
        <h1>
          Matrix: {activePlatform === 'facebook' ? selectedFbPage?.name : `@${igData?.profile?.username}`}
        </h1>
        <p style={{ color: '#65676b', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {activePlatform} Analytics
        </p>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading Matrix Data...</div>
      ) : activePlatform === 'facebook' ? (
        
        /* FACEBOOK MATRIX */
        <div className={styles.dashboardContent}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span>Followers</span>
              <h2>{fbData?.profile?.followers_count?.toLocaleString() || 0}</h2>
            </div>
            <div className={styles.statCard}>
              <span>Page Likes</span>
              <h2>{fbData?.profile?.fan_count?.toLocaleString() || 0}</h2>
            </div>
          </div>

          <div className={styles.chartSection}>
            <h3>Page Views (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={fbData?.metrics?.find((m: any) => m.name === 'page_views_total')?.values}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="end_time" tickFormatter={(t) => t.split('T')[0]} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#1877f2" fill="#1877f2" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      ) : (

        /* INSTAGRAM MATRIX */
        <div className={styles.dashboardContent}>
          
          {/* Sub-Tabs for IG: Account vs Post Level */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <button 
              onClick={() => setIgViewTab('account')}
              style={{ 
                padding: '0.8rem 2rem', borderRadius: '30px', border: '2px solid #E1306C', 
                background: igViewTab === 'account' ? '#E1306C' : 'white', 
                color: igViewTab === 'account' ? 'white' : '#E1306C', 
                cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s ease'
              }}
            >
              Account Level
            </button>
            <button 
              onClick={() => setIgViewTab('posts')}
              style={{ 
                padding: '0.8rem 2rem', borderRadius: '30px', border: '2px solid #E1306C', 
                background: igViewTab === 'posts' ? '#E1306C' : 'white', 
                color: igViewTab === 'posts' ? 'white' : '#E1306C', 
                cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s ease'
              }}
            >
              Post Level
            </button>
          </div>

          {/* Render content based on selected tab */}
          {igViewTab === 'account' ? (
            <>
              <h3 style={{ marginBottom: '1.5rem', color: '#1c1e21' }}>Profile Insights</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}><span>Followers</span><h2>{igData?.profile?.followers_count?.toLocaleString() || 0}</h2></div>
                <div className={styles.statCard}><span>Total Posts</span><h2>{igData?.profile?.media_count?.toLocaleString() || 0}</h2></div>
                <div className={styles.statCard}><span>Account Reach</span><h2>{getIgAccountMetric('reach')}</h2></div>
                <div className={styles.statCard}><span>Accounts Engaged</span><h2>{getIgAccountMetric('accounts_engaged')}</h2></div>
                <div className={styles.statCard}><span>Total Interactions</span><h2>{getIgAccountMetric('total_interactions')}</h2></div>
                <div className={styles.statCard}><span>Profile Views</span><h2>{getIgAccountMetric('views')}</h2></div>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ marginBottom: '1.5rem', color: '#1c1e21' }}>Aggregated Post Performance</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}><span>Total Likes</span><h2>{igSummary?.totalLikes?.toLocaleString() || 0}</h2></div>
                <div className={styles.statCard}><span>Total Comments</span><h2>{igSummary?.totalComments?.toLocaleString() || 0}</h2></div>
                <div className={styles.statCard}><span>Total Impressions</span><h2>{igSummary?.totalImpressions?.toLocaleString() || 0}</h2></div>
                <div className={styles.statCard}><span>Total Reach</span><h2>{igSummary?.totalReach?.toLocaleString() || 0}</h2></div>
                <div className={styles.statCard}><span>Total Saved</span><h2>{igSummary?.totalSaved?.toLocaleString() || 0}</h2></div>
              </div>
              <p style={{ textAlign: 'center', color: '#65676b', marginTop: '1.5rem', fontStyle: 'italic' }}>
                These metrics represent the combined totals from your individual business posts.
              </p>
            </>
          )}

        </div>
      )}
    </div>
  );
};

export default FacebookAnalytics;

export const getServerSideProps: GetServerSideProps = withAuth(async (context) => {
  return { props: {} };
});