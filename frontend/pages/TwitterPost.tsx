import React, { useState } from 'react';
import apiClient from '../lib/axios'; // Your configured Axios instance
import styles from '../styles/TwitterPost.module.css';
import { withAuth } from '../utils/withAuth';
import { GetServerSideProps } from 'next';

const MAX_TWEET_CHARS = 280;

const TwitterPost: React.FC = () => {
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    // Create the payload to send to backend
    const payload: { text: string; mediaUrls?: string[] } = {
      text: text.trim(),
    };
    if (mediaUrl.trim()) {
      payload.mediaUrls = [mediaUrl.trim()];
    }

    try {
      // ✅ Updated endpoint for media support
      const res = await apiClient.post(
        '/twitter/post-media',
        payload,
        { withCredentials: true }
      );

      setResult(res.data);
      setText('');
      setMediaUrl('');
    } catch (err: any) {
      console.error(err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        'Failed to post tweet with media';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>Post to Twitter</h2>

        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TWEET_CHARS}
          placeholder="What's happening?"
        />

        <input
          type="text"
          className={styles.input}
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="Optional: Image/Video URL (e.g., https://.../file.png)"
          disabled={loading}
        />

        <div className={styles.row}>
          <span className={styles.counter}>
            {text.length}/{MAX_TWEET_CHARS}
          </span>
          <button
            className={styles.postButton}
            onClick={handlePost}
            disabled={loading || text.trim().length === 0}
          >
            {loading ? 'Posting...' : 'Post Tweet'}
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            Error: {JSON.stringify(error)}
          </div>
        )}

        {result && (
          <div className={styles.result}>
            ✅ Posted! Tweet ID: {result.data?.id || JSON.stringify(result)}
          </div>
        )}
      </div>
    </div>
  );
};

// Protect route with authentication
export const getServerSideProps: GetServerSideProps = withAuth(async () => ({
  props: {},
}));

export default TwitterPost;
