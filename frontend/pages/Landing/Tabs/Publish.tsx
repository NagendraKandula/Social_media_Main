import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import styles from '../../../styles/LandingCSS/Tabs/Publish.module.css';

import ChannelSelector, { Channel } from '../../../components/ChannelSelector';
import { PlatformState } from '../../../components/PlatformFields';

import { usePostCreation } from '../../../hooks/usePostCreation';
import apiClient from '../../../lib/axios';
import { validateInstagramMediaSpecs } from '../../../utils/instagramMediaSpecs';
import { resolveEditorRules } from '../../../utils/resolveEditorRules';

const LazyContentEditor = dynamic(() => import('../../../components/ContentEditor'), {
  loading: () => <p>Loading editor...</p>,
});
const LazyPlatformFields = dynamic(() => import('../../../components/PlatformFields'), {
  loading: () => <p>Loading platform options...</p>,
});
const LazyAIAssistant = dynamic(() => import('../../../components/AIAssistant'), {
  loading: () => <p>Loading AI assistant...</p>,
});
const LazyDynamicPreview = dynamic(() => import('../../../components/DynamicPreview'), {
  loading: () => <p>Loading preview...</p>,
});

/* ===============================
   Types
================================ */

interface FacebookPage {
  id: string;
  name: string;
  pictureUrl?: string | null;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

interface SocialAccount {
  name: string;
  profilePic?: string;
  needsReconnect?: boolean;
}

/* ===============================
   Component
================================ */

export default function Publish() {
  /* ===============================
     Core State
  ================================ */

  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());

  const [rightTab, setRightTab] = useState<'ai' | 'preview'>('ai');

  const [platformState, setPlatformState] = useState<PlatformState>({
    facebookPostType: 'feed',
    instagramPostType: 'post',
    youtubeType: 'video',
  });

  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [accounts, setAccounts] = useState<Partial<Record<Channel, SocialAccount>>>({});

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewMode, setReviewMode] = useState<'publish' | 'schedule'>('publish');
  const [scheduleDate, setScheduleDate] = useState('');

  const { uploadMultipleMedia, createPost, uploading, publishing } = usePostCreation();
  /* ===============================
     Derived Data
  ================================ */

  const selectedChannelList = useMemo(
    () => Array.from(selectedChannels),
    [selectedChannels]
  );

  const effectiveRules = useMemo(
    () => resolveEditorRules(selectedChannelList),
    [selectedChannelList]
  );

  const selectedFacebookPage = useMemo(
    () =>
      facebookPages.find(
        (page) => page.id === platformState.facebookPageId
      ),
    [facebookPages, platformState.facebookPageId]
  );

  const disabledChannels = useMemo(() => {
    const disabled = new Set<Channel>();

    const imageCount = files.filter((file) => file.type.startsWith('image/')).length;
    const videoCount = files.filter((file) => file.type.startsWith('video/')).length;
    const hasImages = imageCount > 0;
    const hasVideos = videoCount > 0;
    const hasMixedMedia = hasImages && hasVideos;
    const totalItems = files.length;
    const isInstagramStory = platformState.instagramPostType === 'story';

    if (totalItems === 0) {
      return disabled;
    }

    if (isInstagramStory && totalItems > 1) {
      disabled.add('instagram');
    } else if (totalItems > 10) {
      disabled.add('instagram');
    }

    if (totalItems > 10) {
      disabled.add('threads');
    }

    if (hasMixedMedia || videoCount > 1 || imageCount > 4) {
      disabled.add('twitter');
    }

    if (hasMixedMedia || videoCount > 1 || (hasVideos && imageCount > 0) || imageCount > 9) {
      disabled.add('linkedin');
    }

    if (hasMixedMedia || videoCount > 1) {
      disabled.add('facebook');
    }

    if (hasImages || videoCount > 1 || totalItems > 1) {
      disabled.add('youtube');
    }

    return disabled;
  }, [files, platformState.instagramPostType]);

  useEffect(() => {
    let changed = false;
    const nextChannels = new Set(selectedChannels);

    disabledChannels.forEach((channel) => {
      if (nextChannels.has(channel)) {
        nextChannels.delete(channel);
        changed = true;
      }
    });

    if (changed) {
      setSelectedChannels(nextChannels);
      alert('Some selected channels were removed because the current media does not match their publishing limits.');
    }
  }, [files, selectedChannels, disabledChannels]);

  const getInstagramValidationErrors = async () => {
    if (!selectedChannels.has('instagram') || files.length === 0) {
      return [];
    }

    return validateInstagramMediaSpecs(
      files,
      platformState.instagramPostType || 'post'
    );
  };

  const alertInstagramValidationErrors = (errors: string[]) => {
    alert(`Instagram media does not match the required specs:\n\n${errors.join('\n')}`);
  };

  /* ===============================
     Fetch Connected Accounts
  ================================ */

  useEffect(() => {
    apiClient
      .get('/auth/social/active-accounts')
      .then((res) => setAccounts(res.data))
      .catch((err) =>
        console.error('Failed to fetch connected accounts', err)
      );
  }, []);

  /* ===============================
     Facebook Pages
  ================================ */

  useEffect(() => {
    if (!accounts.facebook) return;

    apiClient
      .get('/facebook/pages')
      .then(({ data }) => {
        setFacebookPages(data);
        if (!platformState.facebookPageId && data.length > 0) {
          setPlatformState((prev) => ({
            ...prev,
            facebookPageId: data[0].id,
          }));
        }
      })
      .catch((err) => console.error('FB Pages Error:', err));
  }, [accounts.facebook, platformState.facebookPageId]);

  /* ===============================
     Submit
  ================================ */

const handleSubmit = async (isScheduled: boolean) => {
    if (selectedChannels.size === 0) {
      alert('Select at least one channel.');
      return;
    }

    if (!content && files.length === 0) {
      alert('Add content or media.');
      return;
    }

    try {
      const instagramErrors = await getInstagramValidationErrors();
      if (instagramErrors.length > 0) {
        alertInstagramValidationErrors(instagramErrors);
        return;
      }

      // ✅ 1. Use YOUR existing hook to upload all files at once!
      let uploadedMediaItems: any[] = [];

      if (files.length > 0) {
        const uploadResults = await uploadMultipleMedia(files);
        
        // Format the results to match your new backend DTO
        uploadedMediaItems = uploadResults.map((result: any, index: number) => ({
          mediaUrl: result.publicUrl,
          storagePath: result.storagePath,
          mimeType: files[index].type,
          mediaType: files[index].type.startsWith('video') ? 'VIDEO' : 'IMAGE',
        }));
      }

      const platformOverrides: any = {};

      if (selectedChannels.has('facebook')) {
        platformOverrides.facebook = {
          pageId: platformState.facebookPageId,
          postType: platformState.facebookPostType,
        };
      }
      if (selectedChannels.has('instagram')) {
        platformOverrides.instagram = { postType: platformState.instagramPostType };
      }
      if (selectedChannels.has('youtube')) {
        platformOverrides.youtube = { title: platformState.youtubeTitle, postType: platformState.youtubeType };
      }

      // ✅ 2. Send the 'mediaItems' array to the backend
      const payload = {
        content,
        mediaItems: uploadedMediaItems, 
        platforms: selectedChannelList,
        scheduledAt: isScheduled ? new Date(scheduleDate).toISOString() : null,
        contentMetadata: {
          text: content,
          platformOverrides,
        },
      };

      await createPost(payload);

      alert(isScheduled ? 'Post scheduled successfully' : 'Post published successfully');

      setContent('');
      setFiles([]);
      setSelectedChannels(new Set());
      setScheduleDate('');
      setShowScheduleModal(false);
      setShowReviewModal(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to create post');
    }
  };

  const openReview = async (mode: 'publish' | 'schedule') => {
    if (selectedChannels.size === 0) {
      alert('Select at least one channel.');
      return;
    }

    if (!content && files.length === 0) {
      alert('Add content or media.');
      return;
    }

    if (mode === 'schedule' && !scheduleDate) {
      alert('Pick a schedule date and time.');
      return;
    }

    const instagramErrors = await getInstagramValidationErrors();
    if (instagramErrors.length > 0) {
      alertInstagramValidationErrors(instagramErrors);
      return;
    }

    setReviewMode(mode);
    setShowScheduleModal(false);
    setShowReviewModal(true);
  };

  /* ===============================
     UI
  ================================ */

  return (
    <div className={styles.publishPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Publish</h1>
          <p>Create once, tailor by platform, and publish when it is ready.</p>
        </div>

        <div className={styles.headerMeta}>
          <span>{selectedChannels.size} channel{selectedChannels.size === 1 ? '' : 's'}</span>
          <span>{files.length} media</span>
        </div>
      </div>

      <div className={styles.mainLayout}>
        {/* LEFT COLUMN */}
        <div className={styles.leftColumn}>
          <div className={styles.leftCard}>
           {/* TOP ROW */}
<div className={styles.topRow}>
  <ChannelSelector
    accounts={accounts}
    selectedChannels={selectedChannels}
    onSelectionChange={setSelectedChannels}
    disabledChannels={disabledChannels}
    facebookPages={facebookPages}
    selectedFacebookPageId={platformState.facebookPageId}
    onFacebookPageSelect={(pageId) =>
      setPlatformState((prev) => ({ ...prev, facebookPageId: pageId }))
    }
  />

  <div className={styles.topActions}>
    <button className={styles.secondaryBtn}>Draft</button>
    <button
      className={styles.secondaryBtn}
      onClick={() => setShowScheduleModal(true)}
    >
      Schedule
    </button>
    <button
      className={styles.primaryBtn}
      onClick={() => openReview('publish')}
      disabled={uploading || publishing}
    >
      {uploading || publishing ? 'Publishing...' : 'Publish'}
    </button>
  </div>
</div>


            {/* Content Editor */}
            <LazyContentEditor
              content={content}
              onContentChange={setContent}
              files={files}
              onFilesChange={setFiles}
              effectiveRules={effectiveRules}
              validation={{}}
            />

            {/* Platform Fields */}
            <LazyPlatformFields
              selectedChannels={selectedChannels}
              platformState={platformState}
              setPlatformState={setPlatformState}
              facebookPages={facebookPages}
            />
          </div>
        </div>

        {/* DIVIDER */}
        <div className={styles.divider} />

{/* RIGHT COLUMN */}
<div className={styles.rightColumn}>
  <div className={styles.rightCard}>
    
    {/* Tabs INSIDE the box */}
    <div className={styles.rightHeader}>
      <button
        className={rightTab === 'ai' ? styles.activeTab : ''}
        onClick={() => setRightTab('ai')}
      >
        AI Assistant
      </button>
      <button
        className={rightTab === 'preview' ? styles.activeTab : ''}
        onClick={() => setRightTab('preview')}
      >
        Preview
      </button>
    </div>

    {/* Content */}
    <div className={styles.rightPanel}>
      {rightTab === 'ai' ? (
        <LazyAIAssistant />
      ) : (
        <LazyDynamicPreview
          selectedPlatforms={selectedChannelList}
          content={content}
          mediaFiles={files}
          facebookPostType={platformState.facebookPostType}
          instagramPostType={platformState.instagramPostType}
          youtubeType={platformState.youtubeType}
          accounts={accounts}
          facebookPage={selectedFacebookPage}
        />
      )}
    </div>

  </div>
</div>
</div>


      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className={styles.scheduleOverlay}>
          <div className={styles.scheduleModal}>
            <h3>Pick a Date & Time</h3>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button onClick={() => setShowScheduleModal(false)}>
                Cancel
              </button>
              <button onClick={() => openReview('schedule')}>
                Review
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className={styles.reviewOverlay}>
          <div className={styles.reviewModal}>
            <div className={styles.reviewHeader}>
              <div>
                <h3>Review post</h3>
                <p>
                  {reviewMode === 'schedule'
                    ? `Scheduled for ${new Date(scheduleDate).toLocaleString()}`
                    : 'Ready to publish now'}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeReviewBtn}
                onClick={() => setShowReviewModal(false)}
                aria-label="Close review"
              >
                ×
              </button>
            </div>

            <div className={styles.reviewBody}>
              <section className={styles.reviewSummary}>
                <div>
                  <span className={styles.reviewLabel}>Channels</span>
                  <div className={styles.channelPills}>
                    {selectedChannelList.map((channel) => (
                      <span key={channel}>{channel}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className={styles.reviewLabel}>Media</span>
                  <p>{files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'} attached` : 'No media attached'}</p>
                </div>

                <div>
                  <span className={styles.reviewLabel}>Caption</span>
                  <p className={styles.captionPreview}>{content || 'No caption added.'}</p>
                </div>
              </section>

              <section className={styles.reviewPreview}>
                <LazyDynamicPreview
                  selectedPlatforms={selectedChannelList}
                  content={content}
                  mediaFiles={files}
                  facebookPostType={platformState.facebookPostType}
                  instagramPostType={platformState.instagramPostType}
                  youtubeType={platformState.youtubeType}
                  accounts={accounts}
                  facebookPage={selectedFacebookPage}
                />
              </section>
            </div>

            <div className={styles.reviewActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setShowReviewModal(false)}
              >
                Back to edit
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => handleSubmit(reviewMode === 'schedule')}
                disabled={uploading || publishing}
              >
                {uploading || publishing
                  ? 'Sending...'
                  : reviewMode === 'schedule'
                    ? 'Confirm schedule'
                    : 'Confirm publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
