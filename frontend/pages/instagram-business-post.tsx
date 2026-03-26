import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FaInstagram, FaImage, FaVideo, FaHistory, FaPaperPlane, FaImages } from 'react-icons/fa';
import styles from '../styles/InstagramBusinessPost.module.css';
import apiClient from '../lib/axios';

// ✅ Added CAROUSEL and VIDEO to Media Types
type MediaType = 'IMAGE' | 'VIDEO' | 'REELS' | 'STORIES' | 'CAROUSEL';

const InstagramBusinessPost = () => {
  const router = useRouter();
  
  // State
  const [mediaType, setMediaType] = useState<MediaType>('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>(['', '']); // ✅ Start with 2 empty inputs for Carousel
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Handle URL changes for Carousel inputs
  const handleCarouselUrlChange = (index: number, value: string) => {
    const updatedUrls = [...mediaUrls];
    updatedUrls[index] = value;
    setMediaUrls(updatedUrls);
  };

  const addCarouselUrl = () => {
    if (mediaUrls.length < 10) {
      setMediaUrls([...mediaUrls, '']);
    }
  };

  const removeCarouselUrl = (index: number) => {
    if (mediaUrls.length > 2) {
      const updatedUrls = mediaUrls.filter((_, i) => i !== index);
      setMediaUrls(updatedUrls);
    }
  };

  // Handle Post Submission
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await apiClient.get('/auth/profile');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      // ✅ Construct payload based on Media Type
      const payload: any = {
        mediaType,
        caption: mediaType === 'STORIES' ? undefined : caption,
      };

      if (mediaType === 'CAROUSEL') {
        const validUrls = mediaUrls.filter(url => url.trim() !== '');
        if (validUrls.length < 2) {
          setStatus({ type: 'error', message: '❌ Carousels require at least 2 valid URLs.' });
          setLoading(false);
          return;
        }
        payload.mediaUrls = validUrls;
      } else {
        if (!mediaUrl.trim()) {
          setStatus({ type: 'error', message: '❌ A Media URL is required.' });
          setLoading(false);
          return;
        }
        payload.mediaUrl = mediaUrl;
      }

      const response = await axios.post(
        `${backendUrl}/instagram-business/publish`,
        payload,
        { withCredentials: true } 
      );

      setStatus({ type: 'success', message: '🎉 Content published successfully to Instagram!' });
      setCaption('');
      setMediaUrl('');
      setMediaUrls(['', '']);
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
          <p>Publish Images, Reels, Stories, or Carousels directly to Instagram Business</p>
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
          {/* ✅ Added Carousel Tab */}
          <button 
            className={`${styles.tab} ${mediaType === 'CAROUSEL' ? styles.active : ''}`}
            onClick={() => setMediaType('CAROUSEL')}
          >
            <FaImages /> Carousel
          </button>
        </div>

        {/* --- Form --- */}
        <form onSubmit={handlePost} className={styles.form}>
          
          {/* ✅ Conditional Rendering: Single URL vs Multiple URLs */}
          {mediaType === 'CAROUSEL' ? (
            <div className={styles.inputGroup}>
              <label>Carousel Media URLs (2 to 10 items)</label>
              {mediaUrls.map((url, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input 
                    type="url" 
                    placeholder={`https://example.com/media-${index + 1}.jpg`}
                    value={url}
                    onChange={(e) => handleCarouselUrlChange(index, e.target.value)}
                    required={index < 2} // First 2 are required
                    style={{ flex: 1 }}
                  />
                  {mediaUrls.length > 2 && (
                    <button type="button" onClick={() => removeCarouselUrl(index)} style={{ padding: '0 10px', cursor: 'pointer' }}>
                      X
                    </button>
                  )}
                </div>
              ))}
              {mediaUrls.length < 10 && (
                <button type="button" onClick={addCarouselUrl} style={{ marginTop: '10px', padding: '5px 10px', cursor: 'pointer' }}>
                  + Add Another URL
                </button>
              )}
              <small>Mix and match direct links to JPGs or MP4s.</small>
            </div>
          ) : (
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
            disabled={loading || (mediaType === 'CAROUSEL' ? false : !mediaUrl)}
          >
            {loading ? (
              <span className={styles.loader}>Posting... (This may take a moment for videos)</span>
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