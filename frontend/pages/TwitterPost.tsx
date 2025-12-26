import React, { useState } from 'react';
import apiClient from '../lib/axios';
import styles from '../styles/TwitterPost.module.css';
import { withAuth } from '../utils/withAuth';
import { GetServerSideProps } from 'next';

const MAX_TWEET_CHARS = 280;

const TwitterPost: React.FC = () => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null); // ✅ Store file object
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ✅ Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePost = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setMessage('');

    // ✅ Pack data into FormData
    const formData = new FormData();
    formData.append('text', text);
    if (file) {
      formData.append('file', file); // Must match backend @UseInterceptors(FileInterceptor('file'))
    }

    try {
      const res = await apiClient.post('/twitter/post-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, // ✅ Critical Header
      });

      setMessage(`✅ Tweeted successfully! (Saved to Cloudinary: ${res.data.cloudinaryUrl})`);
      setText('');
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Failed to post tweet');
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

        {/* ✅ File Input for Images/Video */}
        <div style={{ margin: '10px 0' }}>
            <label>Upload Media: </label>
            <input
            type="file"
            accept="image/*,video/mp4,video/quicktime"
            onChange={handleFileChange}
            disabled={loading}
            />
        </div>

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

        {message && (
          <div className={styles.result}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(async () => ({
  props: {},
}));

export default TwitterPost;