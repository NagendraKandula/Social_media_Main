import React, { useState } from 'react';
import apiClient from '../lib/axios';
import styles from '../styles/ThreadsPost.module.css';
import { AxiosError } from 'axios';


const ThreadsPost: React.FC = () => {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !mediaUrl.trim()) {
      setError('Please enter text or provide a media URL.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await apiClient.get('/auth/profile');
      const response = await apiClient.post('/threads/post', {
        content: content.trim(),
        mediaUrl: mediaUrl.trim() || null,
      });

      // ✅ Fixed template literal here
      setMessage(`✅ Post successful! Post ID: ${response.data.postId || 'N/A'}`);
      setContent('');
      setMediaUrl('');
    } catch (err) {
      const axiosError = err as AxiosError;
      const apiError = (axiosError.response?.data as any)?.message;

     // ✅ HANDLE 401: If the refresh token is also expired, 
      // the interceptor might have already redirected, but we catch it here too.
      if (err.response?.status === 401) {
        // You can use router.push('/login') if you import useRouter
        window.location.href = '/login'; 
        return;
      }else {
        setError(apiError || '❌ Something went wrong while posting to Threads.');
      }
      console.error('Threads post error:', axiosError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Post to Threads</h2>
      <p className={styles.subtext}>
        Share text posts or attach media (image/video) via a{' '}
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
            placeholder="What’s on your mind?"
            disabled={loading}
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
            disabled={loading}
          />
          <small>Must be a public link ending in .jpg, .png, or .mp4</small>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? 'Posting...' : 'Post to Threads'}
        </button>
      </form>

      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default ThreadsPost;
