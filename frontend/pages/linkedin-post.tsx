import React, { useState } from 'react';
import apiClient from '../lib/axios';
import styles from '../styles/TwitterPost.module.css';
import { withAuth } from '../utils/withAuth';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

const MAX_LINKEDIN_CHARS = 3000;

const LinkedInPost: React.FC = () => {
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handlePost = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const payload: any = { text };
      if (mediaUrl.trim()) {
        payload.mediaUrl = mediaUrl.trim();
        payload.mediaType = mediaType;
      }

      await apiClient.post('/linkedin/post', payload);

      setMessage('✅ Posted successfully to LinkedIn!');
      setText('');
      setMediaUrl('');
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
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
            <img src="/linkedin.png" alt="LinkedIn" width={40} height={40} />
            <h2 style={{ margin: 0 }}>Post to LinkedIn</h2>
        </div>

        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_LINKEDIN_CHARS}
          placeholder="What do you want to talk about?"
          rows={5}
        />

        {/* Media URL Input */}
        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontWeight: 'bold' }}>Attach Media (Optional Public URL)</label>
            <input 
              type="text" 
              placeholder="https://example.com/image.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ccc',
                width: '100%'
              }}
            />
            
            {mediaUrl && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                 <label>Type:</label>
                 <select 
                    value={mediaType} 
                    onChange={(e) => setMediaType(e.target.value as 'IMAGE' | 'VIDEO')}
                    style={{ padding: '5px', borderRadius: '5px' }}
                 >
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                 </select>
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