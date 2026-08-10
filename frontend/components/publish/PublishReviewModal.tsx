import dynamic from 'next/dynamic';
import type { Channel } from '../ChannelSelector';
import type { PlatformState } from '../PlatformFields';
import type { ChannelContentMap, FacebookPage, ReviewMode, SocialAccount } from '../../features/publish/types';
import { CHANNEL_LABELS } from '../../features/publish/constants';
import { formatFileSize } from '../../features/publish/formatters';
import styles from '../../styles/LandingCSS/Tabs/Publish.module.css';

const DynamicPreview = dynamic(() => import('../DynamicPreview'), {
  loading: () => <p>Loading preview...</p>,
});

interface Props {
  mode: ReviewMode;
  scheduleDate: string;
  channels: Channel[];
  channelContents: ChannelContentMap;
  fallbackContent: string;
  files: File[];
  
  // 🌟 NEW: Added prop to receive cropped files mapped by platform
  mediaFilesByPlatform?: Record<string, File[]>;
  
  platformState: PlatformState;
  accounts: Partial<Record<Channel, SocialAccount>>;
  facebookPage?: FacebookPage;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PublishReviewModal({
  mode,
  scheduleDate,
  channels,
  channelContents,
  fallbackContent,
  files,
  mediaFilesByPlatform, // 🌟 NEW: Destructured here
  platformState,
  accounts,
  facebookPage,
  busy,
  onClose,
  onConfirm,
}: Props) {
  const totalMediaSize = files.reduce((total, file) => total + file.size, 0);

  return (
    <div className={styles.reviewOverlay}>
      <div className={styles.reviewModal} role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div className={styles.reviewHeader}>
          <div>
            <h3 id="review-title">Review post</h3>
            <p>{mode === 'schedule' ? `Scheduled for ${new Date(scheduleDate).toLocaleString()}` : 'Ready to publish now'}</p>
          </div>
          <button type="button" className={styles.closeReviewBtn} onClick={onClose} aria-label="Close review">×</button>
        </div>

        <div className={styles.reviewBody}>
          <section className={styles.reviewSummary}>
            <div>
              <span className={styles.reviewLabel}>Channels</span>
              <div className={styles.channelPills}>
                {channels.map((channel) => <span key={channel}>{CHANNEL_LABELS[channel]}</span>)}
              </div>
            </div>

            <div>
              <span className={styles.reviewLabel}>Media</span>
              {files.length > 0 ? (
                <div className={styles.mediaSummary}>
                  <p>{files.length} file{files.length === 1 ? '' : 's'} attached</p>
                  <p>Total size: {formatFileSize(totalMediaSize)}</p>
                </div>
              ) : <p>No media attached</p>}
            </div>

            <div>
              <span className={styles.reviewLabel}>Channel captions</span>
              {channels.map((channel) => (
                <div key={channel}>
                  <strong>{CHANNEL_LABELS[channel]}</strong>
                  <p className={styles.captionPreview} dangerouslySetInnerHTML={{ __html: channelContents[channel] || 'No caption added.' }}></p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.reviewPreview}>
            <DynamicPreview
              selectedPlatforms={channels}
              content={fallbackContent}
              channelContents={channelContents}
              mediaFiles={files}
              
              // 🌟 NEW: Pass the cropped media down to the Preview component
              mediaFilesByPlatform={mediaFilesByPlatform}
              
              facebookPostType={platformState.facebookPostType}
              instagramPostType={platformState.instagramPostType}
              youtubeType={platformState.youtubeType}
              accounts={accounts}
              facebookPage={facebookPage}
            />
          </section>
        </div>

        <div className={styles.reviewActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>Back to edit</button>
          <button type="button" className={styles.primaryBtn} onClick={onConfirm} disabled={busy}>
            {busy ? 'Sending...' : mode === 'schedule' ? 'Confirm schedule' : 'Confirm publish'}
          </button>
        </div>
      </div>
    </div>
  );
}