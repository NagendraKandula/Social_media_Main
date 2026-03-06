import { useState, FormEvent, useEffect } from 'react';
import apiClient from '../lib/axios';
import styles from '../styles/FacebookPost.module.css';
import { GetServerSideProps } from 'next';
import { withAuth } from '../utils/withAuth';
import Image from 'next/image';

interface FacebookPage {
  id: string;
  name: string;
  pictureUrl: string | null;
}

const FacebookPostPage = () => {
  const [content, setContent] = useState('');
  
  // UPDATED: Use an array of strings to handle multiple URLs
  const [mediaUrls, setMediaUrls] = useState<string[]>(['']);
  
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'STORY' | 'REEL'>('IMAGE');
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPages = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get('/facebook/pages');
        if (response.data && response.data.length > 0) {
          setPages(response.data);
          setSelectedPageId(response.data[0].id);
        } else {
          setError('No Facebook pages found. Please connect a page.');
        }
      } catch (err) {
        setError('Could not fetch your Facebook pages.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPages();
  }, []);

  // NEW: Handlers for multiple URLs
  const handleMediaUrlChange = (index: number, value: string) => {
    const newUrls = [...mediaUrls];
    newUrls[index] = value;
    setMediaUrls(newUrls);
  };

  const addMediaUrl = () => {
    setMediaUrls([...mediaUrls, '']);
  };

  const removeMediaUrl = (index: number) => {
    const newUrls = mediaUrls.filter((_, i) => i !== index);
    setMediaUrls(newUrls);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Filter out any empty inputs before validating/submitting
    const validUrls = mediaUrls.filter(url => url.trim() !== '');

    if (validUrls.length === 0) {
      setError('Please provide at least one media URL.');
      return;
    }
    if (!selectedPageId) {
      setError('Please select a page to post to.');
      return;
    }

    setIsLoading(true);
    setMessage(''); 
    setError('');   

    // UPDATED: Sending the valid array of URLs
    const body = {
      content,
      mediaUrls: validUrls, // Ensure your backend is looking for 'mediaUrls' (array) instead of 'mediaUrl' (string)
      mediaType,
      pageId: selectedPageId,
    };

    try {
      await apiClient.get('/auth/profile');
      const response = await apiClient.post('/facebook/post', body, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      setMessage(response.data.message || 'Successfully posted to Facebook!');
      setContent('');
      setMediaUrls(['']); // Reset back to a single empty input
    } catch (err: any) {
      if (err.response?.status === 401) {
         window.location.href = '/login';
         return;
      }
      setError(err.response?.data?.message || 'An error occurred while posting.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Create a Facebook Post</h1>
        <p className={styles.subtitle}>
          Post photos or videos to your Facebook Page using public URLs
        </p>
        <form onSubmit={handleSubmit}>
          
          <div className={styles.formGroup}>
            <label htmlFor="page-select">Post to Page:</label>
            <div className={styles.pageSelector}>
              {/* ... Page Selector logic remains the exact same ... */}
              <button
                type="button"
                className={styles.pageSelectorButton}
                onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
                disabled={isLoading || pages.length === 0}
              >
                {selectedPage && (
                  <>
                    <Image
                      src={selectedPage.pictureUrl || '/profile.png'}
                      alt={selectedPage.name}
                      width={24}
                      height={24}
                      className={styles.pageImage}
                    />
                    <span>{selectedPage.name}</span>
                  </>
                )}
                <span className={styles.dropdownIcon}>▼</span>
              </button>

              {isPageDropdownOpen && (
                <div className={styles.pageSelectorDropdown}>
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className={styles.pageSelectorItem}
                      onClick={() => {
                        setSelectedPageId(page.id);
                        setIsPageDropdownOpen(false);
                      }}
                    >
                      <Image
                        src={page.pictureUrl || '/profile.png'}
                        alt={page.name}
                        width={32}
                        height={32}
                        className={styles.pageImage}
                      />
                      <span>{page.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* UPDATED: Dynamic Media URL Inputs */}
          <div className={styles.formGroup}>
            <label>Media URLs:</label>
            {mediaUrls.map((url, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  className={styles.input}
                  value={url}
                  onChange={(e) => handleMediaUrlChange(index, e.target.value)}
                  placeholder="https://example.com/my-image.jpg"
                  disabled={isLoading}
                  style={{ flexGrow: 1, marginBottom: 0 }} 
                />
                {mediaUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMediaUrl(index)}
                    disabled={isLoading}
                    style={{ padding: '0 12px', cursor: 'pointer', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px' }}
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button" 
              onClick={addMediaUrl} 
              disabled={isLoading}
              style={{ marginTop: '8px', padding: '8px', cursor: 'pointer', background: '#e3f2fd', border: 'none', borderRadius: '4px', color: '#1565c0' }}
            >
              + Add Another URL
            </button>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="media-type">Media Type:</label>
            <select
              id="media-type"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as 'IMAGE' | 'VIDEO' | 'STORY'| 'REEL')}
              disabled={isLoading}
              className={styles.select}
            >
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="REEL">Reel</option>
              <option value="STORY">Story</option>
            </select>
          </div>
          
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
            disabled={isLoading}
          />

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? 'Posting...' : 'Post to Facebook'}
          </button>
        </form>
        {message && <p className={styles.successMessage}>{message}</p>}
        {error && <p className={styles.errorMessage}>{error}</p>}
      </div>
    </div>
  );
};

export default FacebookPostPage;