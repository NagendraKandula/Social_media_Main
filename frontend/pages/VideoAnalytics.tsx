import { useState, useEffect } from 'react';
import axios from '../lib/axios';
import { useRouter } from 'next/router';
import styles from '../styles/Analytics.module.css';

const VideoAnalytics = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get('/auth/youtube/videos');
        setVideos(response.data);
      } catch (error) {
        console.error('Failed to fetch videos', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleVideoSelect = (videoId) => {
    router.push(`/Analytics?videoId=${videoId}`);
  };

  if (loading) {
    return <p>Loading your videos...</p>;
  }

  return (
    <div className={styles.analyticsContainer}>
      <h1>Select a Video for Analytics</h1>
      <div className={styles.videoGrid}>
        {videos.map((video) => (
          <div 
            key={video.id.videoId} 
            className={styles.videoCard} 
            onClick={() => handleVideoSelect(video.id.videoId)}
          >
            <img 
              src={video.snippet.thumbnails.medium.url} 
              alt={video.snippet.title} 
            />
            <p>{video.snippet.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoAnalytics;