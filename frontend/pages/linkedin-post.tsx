import React, { useState } from 'react';
import apiClient from '../lib/axios'; // Matches your TwitterPost import
import styles from '../styles/TwitterPost.module.css'; // ✅ Re-using Twitter styles for identical look
import { withAuth } from '../utils/withAuth';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

const MAX_LINKEDIN_CHARS = 3000; // LinkedIn allows more text

const LinkedInPost: React.FC = () => {
  const [text, setText] = useState('');
  // const [file, setFile] = useState<File | null>(null); // Image support requires extra backend work
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handlePost = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      // ✅ Using the same apiClient as TwitterPost
      const res = await apiClient.post('/linkedin/post', { text });

      setMessage('✅ Posted successfully to LinkedIn!');
      setText('');
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Failed to post to LinkedIn';
      
      // Handle the case where user is not connected
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
        {/* Header Section */}
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
          rows={6}
        />

        {/* Note: Image upload disabled for now to ensure stability with your current backend scope */}
        {/* <div style={{ margin: '10px 0', opacity: 0.5 }}>
            <label>Upload Media (Coming Soon): </label>
            <input type="file" disabled />
        </div> 
        */}

        <div className={styles.row}>
          <span className={styles.counter}>
            {text.length}/{MAX_LINKEDIN_CHARS}
          </span>
          <button
            className={styles.postButton}
            onClick={handlePost}
            disabled={loading || text.trim().length === 0}
            style={{ backgroundColor: '#0077b5' }} // LinkedIn Blue Override
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

// ✅ Server Side Auth Check (Matches your TwitterPost)
export const getServerSideProps: GetServerSideProps = withAuth(async () => ({
  props: {},
}));

export default LinkedInPost;