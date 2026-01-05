import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FaInstagram, FaImage, FaVideo, FaHistory, FaPaperPlane } from 'react-icons/fa';
import styles from '../styles/InstagramBusinessPost.module.css';
import apiClient from '../lib/axios';

// Enum for Media Types
type MediaType = 'IMAGE' | 'REELS' | 'STORIES';

const InstagramBusinessPost = () => {
  const router = useRouter();
  
  // State
  const [mediaType, setMediaType] = useState<MediaType>('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Handle Post Submission
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await apiClient.get('/auth/profile');
      // ✅ 1. Get Backend URL from Env
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      // ✅ 2. Send Request (Backend handles tokens!)
      // Note: We use withCredentials: true if you rely on Cookies, 
      // OR send 'Authorization' header if you use localStorage JWT.
      // I will assume standard Cookie-based auth as per your setup.
      const response = await axios.post(
        `${backendUrl}/instagram-business/publish`,
        {
          mediaType,
          mediaUrl,
          caption: mediaType === 'STORIES' ? undefined : caption, // Stories don't support captions
        },
        { withCredentials: true } // Important for HttpOnly Cookies
      );

      setStatus({ type: 'success', message: '🎉 Content published successfully to Instagram!' });
      // Optional: Clear form
      setCaption('');
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        router.push('/login');
        return;
      }
      const errorMsg = error.response?.data?.message || 'Failed to publish content. Check the URL and try again.';
      setStatus({ type: 'error', message: `❌ ${errorMsg}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Post to Instagram Business</title>
      </Head>

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <FaInstagram className={styles.igIcon} />
          </div>
          <h1>Create New Post</h1>
          <p>Publish Images, Reels, or Stories directly Instagram Business</p>
        </div>

        {/* --- Media Type Tabs --- */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${mediaType === 'IMAGE' ? styles.active : ''}`}
            onClick={() => setMediaType('IMAGE')}
          >
            <FaImage /> Feed Image
          </button>
          <button 
            className={`${styles.tab} ${mediaType === 'REELS' ? styles.active : ''}`}
            onClick={() => setMediaType('REELS')}
          >
            <FaVideo /> Reel
          </button>
          <button 
            className={`${styles.tab} ${mediaType === 'STORIES' ? styles.active : ''}`}
            onClick={() => setMediaType('STORIES')}
          >
            <FaHistory /> Story
          </button>
        </div>

        {/* --- Form --- */}
        <form onSubmit={handlePost} className={styles.form}>
          
          {/* URL Input */}
          <div className={styles.inputGroup}>
            <label>Media URL (Public Link)</label>
            <input 
              type="url" 
              placeholder="https://example.com/image.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              required
            />
            <small>Must be a direct link (jpg, png, mp4) accessible by Instagram.</small>
          </div>

          {/* Preview Section */}
          {mediaUrl && (
            <div className={styles.preview}>
              <p>Preview:</p>
              {(mediaType === 'IMAGE' || (mediaType === 'STORIES' && !mediaUrl.match(/\.(mp4|mov)$/i))) ? (
                <img src={mediaUrl} alt="Preview" onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : (
                <video src={mediaUrl} controls />
              )}
            </div>
          )}

          {/* Caption Input (Hidden for Stories) */}
          {mediaType !== 'STORIES' && (
            <div className={styles.inputGroup}>
              <label>Caption & Hashtags</label>
              <textarea 
                placeholder="Write a catchy caption... #instagram #business"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
              />
            </div>
          )}

          {mediaType === 'STORIES' && (
            <div className={styles.infoBox}>
              ℹ️ Note: Instagram API does not support captions for Stories. Text must be embedded in the media.
            </div>
          )}

          {/* Status Messages */}
          {status && (
            <div className={`${styles.status} ${styles[status.type]}`}>
              {status.message}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={loading || !mediaUrl}
          >
            {loading ? (
              <span className={styles.loader}>Posting... (This may take a moment)</span>
            ) : (
              <> <FaPaperPlane /> Post Now </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InstagramBusinessPost;