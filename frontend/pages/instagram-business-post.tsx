import React, { useState } from 'react';
import axios from 'axios';
// We can reuse the same styles from the old post page
import styles from '../styles/InstagramPost.module.css';

const InstagramBusinessPost = () => {
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (!caption || !imageUrl) {
      setError('Please provide a caption and an image URL.');
      setLoading(false);
      return;
    }

    try {
      // Get the backend URL (your ngrok URL)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      // --- THIS IS THE NEW PART ---
      // 1. We call the new '/instagram-business/post' endpoint
      // 2. We send 'withCredentials: true' to include the secure cookies
      const response = await axios.post(
        `https://0f4cac010244.ngrok-free.app/instagram-business/post`,
        {
          caption: caption,
          imageUrl: imageUrl,
        },
        {
          withCredentials: true, // <-- CRITICAL: This sends your cookies
        },
      );
      // --- END OF NEW PART ---

      if (response.data.success) {
        setMessage(`Post successful! Post ID: ${response.data.postId}`);
        setCaption('');
        setImageUrl('');
      } else {
        setError('Failed to post to Instagram.');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          'An error occurred. Check the console.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>Create an Instagram Business Post</h2>
        <p>This will post using the new "Instagram Business Login" connection.</p>

        <div className={styles.formGroup}>
          <label htmlFor="caption">Caption</label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption..."
            rows={5}
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="imageUrl">Image URL</label>
          <input
            type="text"
            id="imageUrl"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/your-image.jpg"
            disabled={loading}
          />
          <small>
            Note: Image must be a public URL. For testing, use a link from
            Imgur.
          </small>
        </div>

        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? 'Posting...' : 'Post to Instagram'}
        </button>

        {message && <p className={styles.successMessage}>{message}</p>}
        {error && <p className={styles.errorMessage}>{error}</p>}
      </form>
    </div>
  );
};

export default InstagramBusinessPost;