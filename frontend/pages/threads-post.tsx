import React, { useState } from 'react';
import apiClient from '../lib/axios'; // Assuming you have this
import styles from '../styles/ThreadsPost.module.css'; // We'll create this style file
import { AxiosError } from 'axios';

const ThreadsPost: React.FC = () => {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Threads allows text-only posts, but image/video requires a URL
    if (!content && !mediaUrl) {
      setError('Content or a media URL is required.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await apiClient.post('/threads/post', {
        content,
        mediaUrl: mediaUrl || null, // Send null if empty
      });

      setMessage(`Post successful! Post ID: ${response.data.postId}`);
      setContent('');
      setMediaUrl('');
    } catch (err) {
      const axiosError = err as AxiosError;
      const apiError = (axiosError.response?.data as any)?.message;
      console.error(axiosError);
      setError(
        apiError || 'An unknown error occurred while posting to Threads.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>Post to Threads</h2>
      <p>
        Post text, or text with an image/video using a{' '}
        <strong>publicly accessible URL</strong>.
      </p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="content">Text:</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="What's on your mind?"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="mediaUrl">Media URL (Optional):</label>
          <input
            id="mediaUrl"
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          <small>
            Must be a direct, public URL to a .jpg, .png, or .mp4 file.
          </small>
        </div>
        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? 'Posting...' : 'Post to Threads'}
        </button>
      </form>
      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default ThreadsPost;