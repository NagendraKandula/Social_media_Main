import React, { useState, useEffect, useMemo } from 'react';
import styles from '../styles/Publish.module.css';

import ChannelSelector, { Channel } from '../components/ChannelSelector';
import ContentEditor from '../components/ContentEditor';
import PlatformFields, { PlatformState } from '../components/PlatformFields';
import AIAssistant from '../components/AIAssistant';

import { usePostCreation } from '../hooks/usePostCreation';
import apiClient from '../lib/axios';
import { resolveEditorRules } from '../utils/resolveEditorRules';

/* ===============================
   Types
================================ */

interface FacebookPage {
  id: string;
  name: string;
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
// LOGIC: Calculate which channels are disabled based on files
  
  // LOGIC: Calculate which channels are disabled based on files
  const disabledChannels = useMemo(() => {
    const disabled = new Set<Channel>();
    
    if (files.length > 1) {
      // 1. YouTube only supports 1 video at a time
      disabled.add('youtube');

      // 2. Twitter restricts threads/single tweets to a max of 4 images
      if (files.length > 4) {
        disabled.add('twitter');
      }

      // 3. LinkedIn supports up to 9 images in a gallery
      if (files.length > 9) {
        disabled.add('linkedin');
      }

      // 4. Instagram carousels maximize at 10 items
      if (files.length > 10) {
        disabled.add('instagram');
      }

      // 5. Threads carousels maximize at 20 items
      if (files.length > 20) {
        disabled.add('threads');
      }

      // 6. Facebook Graph API does not support mixing images & videos in single album requests
      const hasVideo = files.some(f => f.type.startsWith('video/'));
      if (hasVideo) {
        disabled.add('facebook');
      }
    }
    
    return disabled;
  }, [files]);

  // LOGIC: Automatically deselect channels if media rules are violated
  useEffect(() => {
    if (files.length > 1) {
      let changed = false;
      const nextChannels = new Set(selectedChannels);

      // Force deselect unsupported channels
      disabledChannels.forEach(ch => {
        if (nextChannels.has(ch)) {
          nextChannels.delete(ch);
          changed = true;
        }
      });

      if (changed) {
        setSelectedChannels(nextChannels);
        const hasVideo = files.some(f => f.type.startsWith('video/'));
        
        if (hasVideo && selectedChannels.has('facebook')) {
          alert('Facebook has been deselected: it does not support mixed albums containing videos. Try posting videos individually or use Instagram Carousels.');
        } else {
          alert('Some platforms were deselected because your media count exceeds their maximum gallery limit (e.g. Twitter max is 4).');
        }
      }
    }
  }, [files, selectedChannels, disabledChannels]);

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
    if (!selectedChannels.has('facebook')) return;

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
  }, [selectedChannels]);

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
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to create post');
    }
  };

  /* ===============================
     UI
  ================================ */

  return (
    <div className={styles.publishPage}>
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
      onClick={() => handleSubmit(false)}
      disabled={uploading || publishing}
    >
      Publish
    </button>
  </div>
</div>


            {/* Content Editor */}
            <ContentEditor
              content={content}
              onContentChange={setContent}
              files={files}
              onFilesChange={setFiles}
              effectiveRules={effectiveRules}
              validation={{}}
            />

            {/* Platform Fields */}
            <PlatformFields
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
        <AIAssistant />
      ) : (
        <div className={styles.previewPlaceholder} />
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
              <button onClick={() => handleSubmit(true)}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}