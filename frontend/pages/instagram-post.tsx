import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FaInstagram, FaImage, FaVideo, FaHistory, FaPaperPlane } from 'react-icons/fa';
import styles from '../styles/InstagramPost.module.css';
import apiClient from "../lib/axios"; // Use the CSS provided below

type MediaType = 'IMAGE' | 'REEL' | 'STORIES';

const InstagramPostViaFacebook = () => {
  const router = useRouter();
  
  // State
  const [mediaType, setMediaType] = useState<MediaType>('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      // ✅ ADD THIS: Trigger session check/refresh before the actual post
      // This allows the interceptor in lib/axios.ts to handle 401 errors
      await apiClient.get('/auth/profile');

      // ✅ Using your Facebook-Auth based endpoint
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      
      await axios.post(
        `${backendUrl}/instagram/post`, 
        {
          content: caption,
          mediaUrl: mediaUrl,
          mediaType: mediaType,
        },
        { 
          withCredentials: true // IMPORTANT: Sends the 'facebook_access_token' cookie
        } 
      );

      setStatus({ type: 'success', message: '🎉 Posted to Instagram successfully!' });
      setCaption('');
      setMediaUrl('');
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        router.push('/login');
        return;
      }
      const errorMsg = error.response?.data?.message || 'Failed to post. Ensure you are logged in with Facebook.';
      setStatus({ type: 'error', message: `❌ ${errorMsg}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Post to Instagram (via FB)</title>
      </Head>

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <FaInstagram className={styles.igIcon} />
          </div>
          <h1>Create Instagram Post</h1>
          <p>Publish via your connected Facebook Account</p>
        </div>

        {/* Media Selector Tabs */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${mediaType === 'IMAGE' ? styles.active : ''}`}
            onClick={() => setMediaType('IMAGE')}
            type="button"
          >
            <FaImage /> Feed
          </button>
          <button 
            className={`${styles.tab} ${mediaType === 'REEL' ? styles.active : ''}`}
            onClick={() => setMediaType('REEL')}
            type="button"
          >
            <FaVideo /> Reel
          </button>
          <button 
            className={`${styles.tab} ${mediaType === 'STORIES' ? styles.active : ''}`}
            onClick={() => setMediaType('STORIES')}
            type="button"
          >
            <FaHistory /> Story
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handlePost} className={styles.form}>
          
          <div className={styles.inputGroup}>
            <label>Media URL (Public Link)</label>
            <input 
              type="url" 
              placeholder="https://example.com/video.mp4"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              required
            />
          </div>

          {/* Preview */}
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

          {/* Caption (Hidden for Stories) */}
          {mediaType !== 'STORIES' && (
            <div className={styles.inputGroup}>
              <label>Caption</label>
              <textarea 
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {mediaType === 'STORIES' && (
            <div className={styles.infoBox}>
              ℹ️ Stories do not support captions via API.
            </div>
          )}

          {status && (
            <div className={`${styles.status} ${styles[status.type]}`}>
              {status.message}
            </div>
          )}

          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={loading || !mediaUrl}
          >
            {loading ? 'Publishing...' : <><FaPaperPlane /> Post Now</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InstagramPostViaFacebook;