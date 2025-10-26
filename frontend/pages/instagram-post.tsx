import React, { useState } from 'react';
import apiClient from '../lib/axios'; // Assuming you have this from your FB implementation
import styles from '../styles/InstagramPost.module.css'; // We'll create this style file
import { AxiosError } from 'axios';

const InstagramPost: React.FC = () => {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) {
      setError('A public image or video URL is required.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await apiClient.post('/instagram/post', {
        content,
        mediaUrl,
      });

      setMessage(`Post successful! Post ID: ${response.data.postId}`);
      setContent('');
      setMediaUrl('');
    } catch (err) {
      const axiosError = err as AxiosError;
      const apiError = (axiosError.response?.data as any)?.message;
      console.error(axiosError);
      setError(
        apiError || 'An unknown error occurred while posting to Instagram.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>Post to Instagram</h2>
      <p>
        Post an image or video using a <strong>publicly accessible URL</strong>.
      </p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="content">Caption:</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Write your caption..."
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="mediaUrl">Media URL:</label>
          <input
            id="mediaUrl"
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            required
          />
          <small>Must be a direct, public URL to a .jpg, .png, or .mp4 file.</small>
        </div>
        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? 'Posting...' : 'Post to Instagram'}
        </button>
      </form>
      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default InstagramPost;