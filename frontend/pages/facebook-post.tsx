import { useState, ChangeEvent, FormEvent } from 'react';
import apiClient from '../lib/axios'; // You are already importing the correct client
import styles from '../styles/FacebookPost.module.css';
import { GetServerSideProps } from 'next';
import { withAuth } from '../utils/withAuth';
interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}
const FacebookPostPage = () => {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);

      // If the file is a video, extract metadata
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window .URL.revokeObjectURL(video.src);
          const duration = video.duration;
          const width = video.videoWidth;
          const height = video.videoHeight;
          setVideoMetadata({ duration, width, height });
         console.log(`Video Metadata: Duration=${duration}s, Size=${width}x${height}`);
        };
        video.src = URL.createObjectURL(file);
      }
      else {
        setVideoMetadata(null);
      }
    }
    else{
      setMediaFile(null);
      setVideoMetadata(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mediaFile) {
      setError('Please select an image or video to upload.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setError('');

    const formData = new FormData();
    formData.append('content', content);
    formData.append('media', mediaFile);
    if(mediaFile.type.startsWith('video/') && videoMetadata){
      formData.append('Duration', videoMetadata.duration.toString());
      formData.append('Width', videoMetadata.width.toString());
      formData.append('Height', videoMetadata.height.toString());
    }

    try {
      // ✅ CHANGED: Use apiClient and remove the hardcoded URL
      const response = await apiClient.post(
        '/facebook/post',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          
        },
      );
      setMessage(response.data.message || 'Successfully posted to Facebook!');
      setContent('');
      setMediaFile(null);
      setVideoMetadata(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while posting.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Create a Facebook Post</h1>
        <p className={styles.subtitle}>Post a photo or video to your Facebook Page</p>
        <form onSubmit={handleSubmit}>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
            disabled={isLoading}
          />
          <label className={styles.fileLabel}>
            {mediaFile ? `Selected: ${mediaFile.name}` : 'Select Image or Video'}
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className={styles.fileInput}
              disabled={isLoading}
            />
          </label>
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
