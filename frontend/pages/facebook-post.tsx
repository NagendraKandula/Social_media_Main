import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import apiClient from '../lib/axios';
import styles from '../styles/FacebookPost.module.css';
import { GetServerSideProps } from 'next';
import { withAuth } from '../utils/withAuth';
import Image from 'next/image'; // Import Next.js Image component

// UPDATED: Interface to include the picture URL
interface FacebookPage {
  id: string;
  name: string;
  pictureUrl: string | null;
}

const FacebookPostPage = () => {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  
  // State for pages
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  
  // NEW: State to manage the custom dropdown
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
          setSelectedPageId(response.data[0].id); // Default to the first page
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) {
      setError('Please provide a media URL.');
      return;
    }
    if (!selectedPageId) {
      setError('Please select a page to post to.');
      return;
    }

    setIsLoading(true);
    // ... (rest of the submit logic is the same)

    const body = {
      content,
      mediaUrl,
      mediaType,
      pageId: selectedPageId,
    };

    try {
      const response = await apiClient.post('/facebook/post', body, {
        headers: { 'Content-Type': 'application/json' },
      });
      // ... (rest of try/catch is the same)
      setMessage(response.data.message || 'Successfully posted to Facebook!');
      setContent('');
      setMediaUrl('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while posting.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // NEW: Helper to get the currently selected page object
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Create a Facebook Post</h1>
        <p className={styles.subtitle}>
          Post a photo or video to your Facebook Page using a public URL
        </p>
        <form onSubmit={handleSubmit}>
          
          {/* NEW: Custom Page Selector Dropdown */}
          <div className={styles.formGroup}>
            <label htmlFor="page-select">Post to Page:</label>
            <div className={styles.pageSelector}>
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

          {/* ... (Media URL, Media Type, and Textarea inputs remain the same) ... */}

          <div className={styles.formGroup}>
            <label htmlFor="media-url">Media URL:</label>
            <input
              type="text"
              id="media-url"
              className={styles.input}
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://example.com/my-image.jpg"
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="media-type">Media Type:</label>
            <select
              id="media-type"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as 'IMAGE' | 'VIDEO')}
              disabled={isLoading}
              className={styles.select}
            >
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
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

export const getServerSideProps: GetServerSideProps = withAuth(async (context) => {
  return {
    props: {},
  };
});