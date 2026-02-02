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

  const { uploadMedia, createPost, uploading, publishing } = usePostCreation();

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
      let mediaData = { publicUrl: '', storagePath: '', mimeType: '' };

      if (files.length > 0) {
        const uploaded = await uploadMedia(files[0]);
        mediaData = {
          publicUrl: uploaded.publicUrl,
          storagePath: uploaded.storagePath,
          mimeType: files[0].type,
        };
      }

      const platformOverrides: any = {};

      if (selectedChannels.has('facebook')) {
        platformOverrides.facebook = {
          pageId: platformState.facebookPageId,
          postType: platformState.facebookPostType,
        };
      }

      if (selectedChannels.has('instagram')) {
        platformOverrides.instagram = {
          postType: platformState.instagramPostType,
        };
      }

      if (selectedChannels.has('youtube')) {
        platformOverrides.youtube = {
          title: platformState.youtubeTitle,
          postType: platformState.youtubeType,
        };
      }

      const payload = {
        content,
        mediaUrl: mediaData.publicUrl,
        storagePath: mediaData.storagePath,
        mimeType: mediaData.mimeType,
        mediaType: mediaData.mimeType.startsWith('video')
          ? 'VIDEO'
          : 'IMAGE',
        platforms: selectedChannelList,
        scheduledAt: isScheduled
          ? new Date(scheduleDate).toISOString()
          : null,
        contentMetadata: {
          text: content,
          platformOverrides,
        },
      };

      await createPost(payload);

      alert(
        isScheduled
          ? 'Post scheduled successfully'
          : 'Post published successfully'
      );

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