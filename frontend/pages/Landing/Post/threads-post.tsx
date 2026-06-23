import React, { useState } from 'react';
import apiClient from '../../../lib/axios';
import styles from '../../../styles/LandingCSS/PostCSS/ThreadsPost.module.css';
import { AxiosError } from 'axios';

const MAX_CHARS = 500;
const MAX_IMAGE_SIZE_BYTES = 8_000_000;
const MAX_VIDEO_SIZE_BYTES = 1_000_000_000;

interface MediaItem {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

const ThreadsPost: React.FC = () => {
  const [content, setContent] = useState('');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [tempMediaUrl, setTempMediaUrl] = useState('');
  const [tempMediaType, setTempMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddMedia = () => {
    if (!tempMediaUrl.trim()) return;

    const newMedia: MediaItem = {
      id: Date.now().toString(),
      url: tempMediaUrl.trim(),
      type: tempMediaType,
    };

    setMediaList([...mediaList, newMedia]);
    setTempMediaUrl('');
    setTempMediaType('IMAGE');
  };

  const handleRemoveMedia = (id: string) => {
    setMediaList(mediaList.filter(m => m.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && mediaList.length === 0) {
      setError('Please enter text or provide media.');
      return;
    }

    if (content.length > MAX_CHARS) {
      setError('Threads text is limited to 500 characters.');
      return;
    }

    if (mediaList.length > 10) {
      setError('Maximum 10 media items allowed for Threads carousel.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await apiClient.get('/auth/profile');

      const payload: any = {
        content: content.trim(),
      };

      if (mediaList.length > 0) {
        payload.mediaList = mediaList.map(m => ({
          url: m.url,
          type: m.type,
        }));
      }

      const response = await apiClient.post('/threads/post', payload);

      const postId = response.data.postId || 'N/A';
      const apiMessage = response.data.message;

      setMessage(
        apiMessage
          ? `✅ ${apiMessage}! Post ID: ${postId}`
          : `✅ Posted successfully! Post ID: ${postId}`
      );

      setContent('');
      setMediaList([]);

      setTimeout(() => setMessage(''), 4000);

    } catch (err) {
      const axiosError = err as AxiosError;
      const status = axiosError.response?.status;
      const apiError = (axiosError.response?.data as any)?.message;

      if (status === 401) {
        window.location.href = '/Auth/login';
        return;
      }

      setError(apiError || 'Something went wrong while posting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Post to Threads</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        
        {/* TEXT */}
        <div className={styles.formGroup}>
          <div className={styles.headerRow}>
            <label>Text</label>
            <span className={styles.charCount}>
              {content.length}/{MAX_CHARS}
            </span>
          </div>

          <textarea
            maxLength={MAX_CHARS}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            disabled={loading}
          />
        </div>

        {/* MEDIA INPUT */}
        <div className={styles.formGroup}>
          <label>Attach Media</label>

          <div className={styles.mediaInputRow}>
            <input
              type="url"
              value={tempMediaUrl}
              onChange={(e) => setTempMediaUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              disabled={loading}
            />

            <select
              value={tempMediaType}
              onChange={(e) =>
                setTempMediaType(e.target.value as 'IMAGE' | 'VIDEO')
              }
            >
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
            </select>

            <button
              type="button"
              onClick={handleAddMedia}
              disabled={!tempMediaUrl.trim() || loading}
            >
              Add
            </button>
          </div>
        </div>

        {/* MEDIA LIST */}
        {mediaList.length > 0 && (
          <div className={styles.mediaList}>
            <p>Media ({mediaList.length})</p>

            {mediaList.map((media, index) => (
              <div key={media.id} className={styles.mediaItem}>
                <span>{index + 1}. {media.type}</span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemoveMedia(media.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading || (!content.trim() && mediaList.length === 0)}
          className={styles.submitButton}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </form>

      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default ThreadsPost;
