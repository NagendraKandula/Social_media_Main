import React, { useState } from 'react';
import apiClient from '../lib/axios';
import styles from '../styles/TwitterPost.module.css';
import { withAuth } from '../utils/withAuth';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

const MAX_LINKEDIN_CHARS = 3000;

interface MediaItem {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

const LinkedInPost: React.FC = () => {
  const [text, setText] = useState('');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [tempMediaUrl, setTempMediaUrl] = useState('');
  const [tempMediaType, setTempMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Add media to list
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

  // Remove media from list
  const handleRemoveMedia = (id: string) => {
    setMediaList(mediaList.filter(m => m.id !== id));
  };

  const handlePost = async () => {
    if (!text.trim()) return;

    // Validate media types for LinkedIn
    const imageCount = mediaList.filter(m => m.type === 'IMAGE').length;
    const videoCount = mediaList.filter(m => m.type === 'VIDEO').length;

    if (mediaList.length > 1 && imageCount > 0 && videoCount > 0) {
      setMessage('❌ LinkedIn does not allow mixing images and videos in a single post. Please use either all images or all videos.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const payload: any = { text };
      if (mediaList.length > 0) {
        payload.mediaList = mediaList.map(m => ({ url: m.url, type: m.type }));
      }

      await apiClient.post('/linkedin/post', payload);

      setMessage('✅ Posted successfully to LinkedIn!');
      setText('');
      setMediaList([]);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Failed to post to LinkedIn';
      
      if (err.response?.status === 401) {
         setMessage('⚠️ Account not connected. Redirecting...');
         setTimeout(() => router.push('/LinkedInConnect'), 2000);
      } else {
         setMessage(`❌ ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
      <p className={styles.subtext}>
        Share text posts with images or videos via{' '}
        <strong>publicly accessible URLs</strong>. Multiple media creates a carousel post (same type only).
      </p>

        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_LINKEDIN_CHARS}
          placeholder="What do you want to talk about?"
          rows={5}
        />

        {/* Media Management Section */}
        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontWeight: 'bold' }}>Attach Media (Multiple Images & Videos)</label>
            
            {/* Input for adding media */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="https://example.com/image.jpg"
                value={tempMediaUrl}
                onChange={(e) => setTempMediaUrl(e.target.value)}
                disabled={loading}
                style={{
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ccc',
                  flex: 1,
                  minWidth: '200px'
                }}
              />
              
              <select 
                value={tempMediaType} 
                onChange={(e) => setTempMediaType(e.target.value as 'IMAGE' | 'VIDEO')}
                disabled={loading}
                style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
              >
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
              </select>

              <button
                onClick={handleAddMedia}
                disabled={!tempMediaUrl.trim() || loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0077b5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: !tempMediaUrl.trim() ? 'not-allowed' : 'pointer',
                  opacity: !tempMediaUrl.trim() ? 0.5 : 1,
                }}
              >
                Add Media
              </button>
            </div>

            {/* Display added media items */}
            {mediaList.length > 0 && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '5px',
                border: '1px solid #ddd'
              }}>
                <p style={{ marginTop: 0, fontWeight: 'bold', fontSize: '14px' }}>
                  Added Media ({mediaList.length}):
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {mediaList.map((media, index) => (
                    <div
                      key={media.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>
                          {index + 1}. {media.type}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          wordBreak: 'break-all',
                          color: '#999'
                        }}>
                          {media.url.substring(0, 60)}...
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveMedia(media.id)}
                        disabled={loading}
                        style={{
                          marginLeft: '10px',
                          padding: '4px 12px',
                          backgroundColor: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        <div className={styles.row} style={{ marginTop: '20px' }}>
          <span className={styles.counter}>
            {text.length}/{MAX_LINKEDIN_CHARS}
          </span>
          <button
            className={styles.postButton}
            onClick={handlePost}
            disabled={loading || text.trim().length === 0}
            style={{ backgroundColor: '#0077b5' }} 
          >
            {loading ? 'Posting...' : 'Post to LinkedIn'}
          </button>
        </div>

        {message && (
          <div className={styles.result} style={{ marginTop: '15px' }}>
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

export default LinkedInPost;