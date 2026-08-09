import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, Eye, Maximize2, Sparkles, X } from 'lucide-react';
import styles from '../../../styles/LandingCSS/Tabs/Publish.module.css';

import ChannelSelector, { Channel } from '../../../components/ChannelSelector';
import { AiAnalysisResult, PlatformRecommendation } from '../../../types';
import { PlatformState } from '../../../components/PlatformFields';

import { usePostCreation } from '../../../hooks/usePostCreation';
import apiClient from '../../../lib/axios';
import { resolveEditorRules } from '../../../utils/resolveEditorRules';
import { addNotification } from '../../../utils/notifications';
import { useAppDispatch } from '../../../store/hooks';
import { DASHBOARD_TABS, setActiveTab } from '../../../store/dashboardSlice';
import PublishScheduleModal from '../../../components/publish/PublishScheduleModal';
import PublishReviewModal from '../../../components/publish/PublishReviewModal';
import ContentChannelTabs from '../../../components/publish/ContentChannelTabs';
import ChannelPostOptions from '../../../components/publish/ChannelPostOptions';
import { CHANNEL_LABELS } from '../../../features/publish/constants';
import { getContentSnippet } from '../../../features/publish/formatters';
import {
  getDisabledChannels,
  getFacebookValidationErrors,
  getInstagramValidationErrors,
  validateFilesForSelectedChannels,
} from '../../../features/publish/mediaValidation';
import type {
  ChannelContentMap,
  FacebookPage,
  ImageEditDestination,
  MediaEditDraft,
  MediaEditMap,
  ReviewMode,
  SocialAccount,
} from '../../../features/publish/types';
import {
  getChannelContent,
  reconcileChannelContents,
} from '../../../utils/channelContent.mjs';
import { getSelectedImageFitWarnings } from '../../../features/publish/imageFitAnalysis.mjs';
import {
  getImageEditDestinations,
  getMediaEditKey,
  getPlatformPlacement,
  readImageDimensions,
} from '../../../features/publish/mediaEdits.mjs';

const LazyContentEditor = dynamic(() => import('../../../components/ContentEditor'), {
  loading: () => <p>Loading editor...</p>,
});
const LazyAIAssistant = dynamic(() => import('../../../components/AIAssistant'), {
  loading: () => <p>Loading AI assistant...</p>,
});
const LazyDynamicPreview = dynamic(() => import('../../../components/DynamicPreview'), {
  loading: () => <p>Loading preview...</p>,
});

/* ===============================
   Component
================================ */

export default function Publish() {
  const dispatch = useAppDispatch();
  
  /* ===============================
     Core State
  ================================ */

  const [content, setContent] = useState('');
  const [sharedContent, setSharedContent] = useState('');
  const [channelContents, setChannelContents] = useState<ChannelContentMap>({});
  const [activeEditorChannel, setActiveEditorChannel] = useState<Channel | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  
  // 🌟 Holds crop edits per file/platform combo
  const [mediaEdits, setMediaEdits] = useState<MediaEditMap>({});
  const [mediaEditPreviews, setMediaEditPreviews] = useState<Record<string, File>>({});
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());

  const [activeSidePanel, setActiveSidePanel] = useState<'ai' | 'preview' | null>('ai');
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<PlatformRecommendation[]>([]);
  const [aiEngagement, setAiEngagement] = useState<string | null>(null);
  const [aiResultControls, setAiResultControls] = useState<{
    onBack: () => void;
  } | null>(null);

  const engagementTone = (value?: string | null) => {
    const normalized = value?.toLowerCase();
    if (normalized === 'high') return 'Strong';
    if (normalized === 'low') return 'Needs Attention';
    return 'Steady';
  };

  const handleAnalysisComplete = (result: AiAnalysisResult) => {
    setAiRecommendations(result.analysis?.recommendedPlatforms || []);
    setAiEngagement(result.analysis?.engagementPrediction || null);
  };

  const handleAnalysisReset = () => {
    setAiRecommendations([]);
    setAiEngagement(null);
    setAiResultControls(null);
  };

  const handleApplyCaption = (aiCaption: string) => {
    handleChannelContentChange(content ? `${content}<br/><br/>${aiCaption}` : aiCaption);
  };

  const handleApplyHashtags = (aiHashtags: string[]) => {
    const tagsString = aiHashtags.join(' ');
    handleChannelContentChange(content ? `${content}<br/><br/>${tagsString}` : tagsString);
  };

  const handleAutoSelectPlatforms = (platforms: PlatformRecommendation[]) => {
    const next = new Set(selectedChannels);
    platforms.forEach((p) => {
      if (p.rating >= 4) {
        next.add(p.platform.toLowerCase() as Channel);
      }
    });
    setSelectedChannels(next);
  };

  const handleApplyAiPlatformData = (aiPlatforms: any[]) => {
    setChannelContents((prevContents) => {
      const updatedContents = { ...prevContents };

      aiPlatforms.forEach((aiPlat) => {
        let rawPlatform = aiPlat.platform.toLowerCase();
        const targetId = rawPlatform as Channel;

        const hashtagsStr = aiPlat.hashtags && aiPlat.hashtags.length > 0 
          ? aiPlat.hashtags.join(' ') 
          : '';
        const ctaStr = aiPlat.cta ? `<br/><br/><strong>${aiPlat.cta}</strong>` : '';
        
        const fullContent = `${aiPlat.caption}${ctaStr}<br/><br/>${hashtagsStr}`.trim();

        updatedContents[targetId] = fullContent;
      });

      return updatedContents;
    });
  };

  const [platformState, setPlatformState] = useState<PlatformState>({
    facebookPostType: 'feed',
    instagramPostType: 'post',
    youtubeType: 'video',
  });

  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [accounts, setAccounts] = useState<Partial<Record<Channel, SocialAccount>>>({});

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReviewMode>('publish');
  const [scheduleDate, setScheduleDate] = useState('');

  const { uploadMultipleMedia, createPost, uploading, publishing } = usePostCreation();
  
  /* ===============================
     Derived Data
  ================================ */

  const selectedChannelList = useMemo(
    () => Array.from(selectedChannels),
    [selectedChannels]
  );
  const cropDestinations = useMemo(
    () => getImageEditDestinations(selectedChannelList, platformState) as ImageEditDestination[],
    [selectedChannelList, platformState]
  );

  useEffect(() => {
    if (!isPreviewMaximized) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPreviewMaximized(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPreviewMaximized]);

  useEffect(() => {
    const nextContents = reconcileChannelContents(
      selectedChannelList,
      channelContents,
      sharedContent
    ) as ChannelContentMap;

    setChannelContents(nextContents);

    if (selectedChannelList.length === 0) {
      setActiveEditorChannel(null);
      setContent(sharedContent);
      return;
    }

    if (activeEditorChannel && !selectedChannels.has(activeEditorChannel)) {
      setActiveEditorChannel(null);
      setContent(sharedContent);
    }
  }, [selectedChannelList]);

  const handleChannelContentChange = (value: string) => {
    setContent(value);
    if (!activeEditorChannel) {
      setSharedContent(value);
      setChannelContents(
        Object.fromEntries(selectedChannelList.map((channel) => [channel, value])) as ChannelContentMap
      );
      return;
    }

    setChannelContents((previousContents) => ({
      ...previousContents,
      [activeEditorChannel]: value,
    }));
  };

  const handleEditorTabSelect = (channel: Channel | null) => {
    setActiveEditorChannel(channel);
    setContent(
      channel
        ? getChannelContent(channel, channelContents, sharedContent)
        : sharedContent
    );
  };

  const hasPublishableContent = selectedChannelList.some(
    (channel) => Boolean((channelContents[channel] ?? content).trim())
  );

  const selectedFacebookPage = useMemo(
    () =>
      facebookPages.find(
        (page) => page.id === platformState.facebookPageId
      ),
    [facebookPages, platformState.facebookPageId]
  );

  const getChannelDetail = (channel: Channel) => {
    if (channel === 'facebook') {
      const pageName =
        selectedFacebookPage?.name ||
        facebookPages.find((page) => page.id === platformState.facebookPageId)?.name ||
        'Selected page';
      const postType = platformState.facebookPostType || 'feed';

      return `Facebook - Page: ${pageName}, Type: ${postType}`;
    }

    if (channel === 'instagram') {
      return `Instagram - Type: ${platformState.instagramPostType || 'post'}`;
    }

    if (channel === 'youtube') {
      const title = platformState.youtubeTitle?.trim();
      return `YouTube - Type: ${platformState.youtubeType || 'video'}${title ? `, Title: ${title}` : ''}`;
    }

    return CHANNEL_LABELS[channel] || channel;
  };

  const selectedChannelDetails = useMemo(
    () => selectedChannelList.map((channel) => getChannelDetail(channel)),
    [
      selectedChannelList,
      selectedFacebookPage,
      facebookPages,
      platformState.facebookPageId,
      platformState.facebookPostType,
      platformState.instagramPostType,
      platformState.youtubeTitle,
      platformState.youtubeType,
    ]
  );

  const getNotificationSnippet = () => {
    return getContentSnippet(content, files.length);
  };

  const effectiveRules = useMemo(
    () => resolveEditorRules(activeEditorChannel ? [activeEditorChannel] : selectedChannelList),
    [activeEditorChannel, selectedChannelList]
  );

  const disabledChannels = useMemo(
    () => getDisabledChannels(files, platformState),
    [files, platformState]
  );

  const channelSelectorDisabledChannels = useMemo(
    () =>
      new Set(
        Array.from(disabledChannels).filter(
          (channel) => !selectedChannels.has(channel)
        )
      ),
    [disabledChannels, selectedChannels]
  );

  const getCurrentInstagramValidationErrors = () =>
    getInstagramValidationErrors(
      getFilesWithMediaEdits(files, 'instagram'),
      selectedChannels,
      platformState
    );

  const alertInstagramValidationErrors = (errors: string[]) => {
    alert(`Instagram media does not match the required specs:\n\n${errors.join('\n')}`);
  };

  const getCurrentFacebookValidationErrors = () =>
    getFacebookValidationErrors(files, selectedChannels, platformState);

  const alertFacebookValidationErrors = (errors: string[]) => {
    alert(`Facebook media does not match the selected post type:\n\n${errors.join('\n')}`);
  };

  const waitForPostCompletion = async (postId: number) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2500));

      const { data } = await apiClient.get(`/posting/${postId}/status`);
      const platformStatuses = data.platforms || [];
      const failedPlatforms = platformStatuses.filter((item: any) => item.status === 'FAILED');
      const pendingPlatforms = platformStatuses.filter((item: any) =>
        ['PENDING', 'PUBLISHING'].includes(item.status)
      );

      if (failedPlatforms.length > 0) {
        return {
          status: 'FAILED',
          platforms: failedPlatforms,
        };
      }

      if (pendingPlatforms.length === 0 && platformStatuses.length > 0) {
        return {
          status: 'PUBLISHED',
          platforms: platformStatuses,
        };
      }
    }

    return { status: 'PENDING', platforms: [] };
  };

  const getFilesWithMediaEdits = (sourceFiles: File[], platform: Channel) => {
    const placement = getPlatformPlacement(platform, platformState);
    return sourceFiles.map((file) => {
      const key = getMediaEditKey(file, platform, placement);
      return mediaEditPreviews[key] || file;
    });
  };

  const getSavedMediaEdit = (file: File, destination: ImageEditDestination) =>
    mediaEdits[getMediaEditKey(file, destination.platform, destination.placement)];

  const validateCurrentFiles = (nextFiles: File[]) =>
    validateFilesForSelectedChannels(
      selectedChannels.has('instagram')
        ? getFilesWithMediaEdits(nextFiles, 'instagram')
        : nextFiles,
      selectedChannels,
      platformState
    );

  // 🌟 Handles edits applied in ContentEditor
  const handleMediaEditApply = (
    file: File,
    crop: Omit<MediaEditDraft, 'platform' | 'placement'>,
    renderedPreview: File,
    destination: ImageEditDestination
  ) => {
    setMediaEdits((current) => {
      const next = { ...current };
      next[getMediaEditKey(file, destination.platform, destination.placement)] = {
        ...crop,
        platform: destination.platform.toUpperCase(),
        placement: destination.placement.toUpperCase(), // Ensure uppercase for DB ENUM
      } as MediaEditDraft;
      return next;
    });

    setMediaEditPreviews((current) => {
      const next = { ...current };
      next[getMediaEditKey(file, destination.platform, destination.placement)] = renderedPreview;
      return next;
    });
  };

  const getCurrentImageFitWarnings = (newFiles: File[]) =>
    getSelectedImageFitWarnings(newFiles, selectedChannels, platformState);

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
     Submit Payload Generation
  ================================ */

  const handleSubmit = async (isScheduled: boolean) => {
    if (selectedChannels.size === 0) {
      alert('Select at least one channel.');
      return;
    }

    if (!hasPublishableContent && files.length === 0) {
      alert('Add content or media.');
      return;
    }

    try {
      const instagramErrors = await getCurrentInstagramValidationErrors();
      if (instagramErrors.length > 0) {
        alertInstagramValidationErrors(instagramErrors);
        return;
      }

      const facebookErrors = getCurrentFacebookValidationErrors();
      if (facebookErrors.length > 0) {
        alertFacebookValidationErrors(facebookErrors);
        return;
      }

      let uploadedMediaItems: any[] = [];

      if (files.length > 0) {
        uploadedMediaItems = await uploadMultipleMedia(files);
      }

      const mediaDimensions = await Promise.all(
        files.map((file) =>
          file.type.startsWith('image/')
            ? readImageDimensions(file)
            : Promise.resolve(null)
        )
      );

      // 🌟 Build dynamic Media Slots mapping (Solves Cases 1, 2, and 3)
      const mediaSlots: any[] = [];
      
      if (uploadedMediaItems.length > 0) {
        // CASE 1 & 3: Iterate through selected platforms so single image gets unique crop instructions
        selectedChannelList.forEach((platform) => {
          
          // CASE 2: Iterate through files to maintain Carousel Position
          uploadedMediaItems.forEach((media, index) => {
          const rawPlacement = getPlatformPlacement(platform, platformState);
            
            // 🔍 Match the EXACT key used when saving the crop
            const editKey = getMediaEditKey(files[index], platform, rawPlacement);
            const savedEdit = mediaEdits[editKey];

            // Debug log to ensure the crop data is found!
            console.log(`[Publish Debug] Looking for crop on ${platform}:`, { 
              editKey, 
              wasCropFound: !!savedEdit, 
              savedEdit 
            });

            const dimensions = mediaDimensions[index];
            const isImage = files[index].type.startsWith('image/');

            mediaSlots.push({
              mediaId: media.id, 
              platform: platform.toUpperCase(),
              position: index, // Carousel Order
              
              // Only append edit payload if it's an Image (Videos bypass sharp rendering)
              ...(isImage && dimensions
                ? {
                    edit: {
                      platform: platform.toUpperCase(),
                      placement: rawPlacement.toUpperCase(),
                      // Pull exact custom edits, or default to full-image dimensions
                      cropX: savedEdit ? Math.round(savedEdit.cropX) : 0,
                      cropY: savedEdit ? Math.round(savedEdit.cropY) : 0,
                      cropWidth: savedEdit ? Math.round(savedEdit.cropWidth) : Math.round(dimensions.width),
                      cropHeight: savedEdit ? Math.round(savedEdit.cropHeight) : Math.round(dimensions.height),
                      rotation: savedEdit?.rotation || 0,
                    },
                  }
                : {}),
            });
          });
        });
      }

      const contentMetadata: Record<string, any> = {
        platformOverrides: {}
      };

      if (selectedChannels.has('facebook')) {
        contentMetadata.platformOverrides.facebook = {
          pageId: platformState.facebookPageId,
          postType: platformState.facebookPostType || 'feed',
        };
      }

      if (selectedChannels.has('instagram')) {
        contentMetadata.platformOverrides.instagram = {
          postType: platformState.instagramPostType || 'post',
        };
      }

      if (selectedChannels.has('youtube')) {
        contentMetadata.platformOverrides.youtube = {
          type: platformState.youtubeType || 'video',
          title: platformState.youtubeTitle,
        };
      }

      const payload = {
        primaryCaption: sharedContent || content,
        platforms: selectedChannelList.map(channel => channel.toUpperCase()),
        status: isScheduled ? 'SCHEDULED' : 'PENDING',
        scheduledAt: isScheduled ? new Date(scheduleDate).toISOString() : null,
        mediaSlots: mediaSlots,
        contentMetadata: contentMetadata,
      };

      console.log(
        '[Publish] Sending payload to backend:',
        JSON.stringify(payload, null, 2)
      );

      // Send to backend
      const createdPost = await createPost(payload);

      const channelText = selectedChannelDetails.join(' | ');
      const eventTime = isScheduled
        ? new Date(scheduleDate).toLocaleString()
        : new Date().toLocaleString();

      addNotification({
        type: 'success',
        title: isScheduled ? 'Post scheduled' : 'Post submitted',
        message: getNotificationSnippet(),
        details: [
          ...(createdPost?.id ? [{ label: 'Post ID', value: String(createdPost.id) }] : []),
          { label: 'Channels', value: channelText },
          { label: 'Media', value: `${files.length} file${files.length === 1 ? '' : 's'}` },
          { label: isScheduled ? 'Scheduled' : 'Submitted', value: eventTime },
        ],
      });

      if (!isScheduled && createdPost?.id) {
        waitForPostCompletion(createdPost.id)
          .then((result) => {
            if (result.status === 'PUBLISHED') {
              addNotification({
                type: 'success',
                title: 'Post published',
                message: getNotificationSnippet(),
                details: [
                  { label: 'Post ID', value: String(createdPost.id) },
                  { label: 'Channels', value: channelText },
                  { label: 'Media', value: `${files.length} file${files.length === 1 ? '' : 's'}` },
                  { label: 'Published', value: new Date().toLocaleString() },
                ],
                dedupeKey: `published-now-${createdPost.id}`,
              });
            }

            if (result.status === 'FAILED') {
              const failedChannels = result.platforms
                .map((item: any) => getChannelDetail(item.platform as Channel))
                .join(' | ');
              const errorText = result.platforms
                .map((item: any) => item.errorMessage)
                .filter(Boolean)
                .join(' ');

              addNotification({
                type: 'error',
                title: 'Post failed',
                message: getNotificationSnippet(),
                details: [
                  { label: 'Post ID', value: String(createdPost.id) },
                  { label: 'Channels', value: failedChannels },
                  { label: 'Reason', value: errorText || 'Please review the post and try again.' },
                ],
              });
            }
          })
          .catch((error) => {
            console.error('Failed to check post status:', error);
          });
      }

      alert(isScheduled ? 'Post scheduled successfully' : 'Post submitted for publishing');

      setContent('');
      setSharedContent('');
      setChannelContents({});
      setActiveEditorChannel(null);
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

    if (!hasPublishableContent && files.length === 0) {
      alert('Add content or media.');
      return;
    }

    if (mode === 'schedule' && !scheduleDate) {
      alert('Pick a schedule date and time.');
      return;
    }

    const instagramErrors = await getCurrentInstagramValidationErrors();
    if (instagramErrors.length > 0) {
      alertInstagramValidationErrors(instagramErrors);
      return;
    }

    const facebookErrors = getCurrentFacebookValidationErrors();
    if (facebookErrors.length > 0) {
      alertFacebookValidationErrors(facebookErrors);
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

      </div>

      <div className={`${styles.mainLayout} ${!activeSidePanel ? styles.previewHidden : ''}`}>
        <div className={styles.topRow}>
          <ChannelSelector
            accounts={accounts}
            selectedChannels={selectedChannels}
            onSelectionChange={setSelectedChannels}
            disabledChannels={channelSelectorDisabledChannels}
            facebookPages={facebookPages}
            selectedFacebookPageId={platformState.facebookPageId}
            onFacebookPageSelect={(pageId) =>
              setPlatformState((prev) => ({ ...prev, facebookPageId: pageId }))
            }
            onAddChannel={() => dispatch(setActiveTab(DASHBOARD_TABS.ACTIVE))}
          />

          <div className={styles.topActions}>
            <button
              type="button"
              className={`${styles.headerToolBtn} ${activeSidePanel === 'ai' ? styles.headerToolActive : ''}`}
              onClick={() => setActiveSidePanel((panel) => panel === 'ai' ? null : 'ai')}
              aria-pressed={activeSidePanel === 'ai'}
            >
              <Sparkles size={15} aria-hidden="true" />
              AI Assistant
            </button>
            <button
              type="button"
              className={`${styles.headerToolBtn} ${activeSidePanel === 'preview' ? styles.headerToolActive : ''}`}
              onClick={() => setActiveSidePanel((panel) => panel === 'preview' ? null : 'preview')}
              aria-pressed={activeSidePanel === 'preview'}
            >
              <Eye size={15} aria-hidden="true" />
              Preview
            </button>
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

        <section className={styles.composerPane} aria-label="Post composer">
          {selectedChannelList.length > 0 && <div className={styles.composerControls}>
            <ContentChannelTabs
              selectedChannels={selectedChannelList}
              activeChannel={activeEditorChannel}
              onSelect={handleEditorTabSelect}
            />
            {activeEditorChannel && (
              <div className={styles.inlinePlatformSlot}>
                <ChannelPostOptions
                  channel={activeEditorChannel}
                  platformState={platformState}
                  setPlatformState={setPlatformState}
                />
              </div>
            )}
          </div>}

          <div className={styles.editorSlot}>
            <LazyContentEditor
              content={content}
              onContentChange={handleChannelContentChange}
              files={files}
              onFilesChange={setFiles}
              effectiveRules={effectiveRules}
              validation={{}}
              selectedChannels={selectedChannelList}
              cropDestinations={cropDestinations}
              getSavedMediaEdit={getSavedMediaEdit}
              validateFilesForSelectedChannels={validateCurrentFiles}
              getImageFitWarnings={getCurrentImageFitWarnings}
              onMediaEditApply={handleMediaEditApply}
              onOpenAIAssistant={() => setActiveSidePanel('ai')}
              size="publish"
              aiRecommendations={aiRecommendations}
              platformState={platformState}
            />
          </div>
        </section>

        {activeSidePanel && <aside className={`${styles.previewPane} ${activeSidePanel === 'ai' ? styles.aiPane : ''}`} aria-label={activeSidePanel === 'preview' ? 'Post preview' : 'AI Assistant'}>
          <div className={`${styles.rightHeader} ${activeSidePanel === 'ai' ? styles.aiRightHeader : ''}`}>
            <div className={styles.rightHeaderTitleGroup}>
              {activeSidePanel === 'ai' && aiResultControls && (
                <button
                  type="button"
                  className={styles.aiHeaderIconBtn}
                  onClick={aiResultControls.onBack}
                  aria-label="Back to AI analysis start"
                  title="Back"
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
              )}
              <h2>{activeSidePanel === 'preview' ? 'Post Preview' : 'AI Assistant'}</h2>
            </div>
            <div className={styles.rightHeaderActionGroup}>
              {activeSidePanel === 'preview' && (
                <button
                  type="button"
                  className={styles.previewHeaderIconBtn}
                  onClick={() => setIsPreviewMaximized(true)}
                  aria-label="Maximize post preview"
                  title="Maximize preview"
                >
                  <Maximize2 size={18} aria-hidden="true" />
                </button>
              )}
              {activeSidePanel === 'ai' && aiEngagement && (
                <span className={styles.aiEngagementBadge}>
                  {engagementTone(aiEngagement)}
                </span>
              )}
            </div>
          </div>

          <div className={styles.rightPanel}>
            {activeSidePanel === 'preview' ? (
              <LazyDynamicPreview
                selectedPlatforms={selectedChannelList}
                content={content}
                channelContents={channelContents}
                mediaFiles={files}
                mediaFilesByPlatform={Object.fromEntries(
                  selectedChannelList.map((platform) => [
                    platform,
                    getFilesWithMediaEdits(files, platform),
                  ])
                )}
                facebookPostType={platformState.facebookPostType}
                instagramPostType={platformState.instagramPostType}
                youtubeType={platformState.youtubeType}
                accounts={accounts}
                facebookPage={selectedFacebookPage}
              />
            ) : (
              <LazyAIAssistant
                files={files}
                content={content}
                onAnalysisComplete={handleAnalysisComplete}
                onAnalysisReset={handleAnalysisReset}
                onResultControlsChange={setAiResultControls}
                onApplyCaption={handleApplyCaption}
                onApplyHashtags={handleApplyHashtags}
                onAutoSelectPlatforms={handleAutoSelectPlatforms}
                onApplyPlatformData={handleApplyAiPlatformData}
              />
            )}
          </div>
        </aside>}
      </div>

      {isPreviewMaximized && (
        <div
          className={styles.previewModalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsPreviewMaximized(false);
          }}
        >
          <section
            className={styles.previewModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="maximized-preview-title"
          >
            <header className={styles.previewModalHeader}>
              <h2 id="maximized-preview-title">Post Preview</h2>
              <button
                type="button"
                className={styles.previewHeaderIconBtn}
                onClick={() => setIsPreviewMaximized(false)}
                aria-label="Close maximized post preview"
                title="Close preview"
                autoFocus
              >
                <X size={21} aria-hidden="true" />
              </button>
            </header>
            <div className={styles.previewModalBody}>
              <LazyDynamicPreview
                horizontal
                selectedPlatforms={selectedChannelList}
                content={content}
                channelContents={channelContents}
                mediaFiles={files}
                mediaFilesByPlatform={Object.fromEntries(
                  selectedChannelList.map((platform) => [
                    platform,
                    getFilesWithMediaEdits(files, platform),
                  ])
                )}
                facebookPostType={platformState.facebookPostType}
                instagramPostType={platformState.instagramPostType}
                youtubeType={platformState.youtubeType}
                accounts={accounts}
                facebookPage={selectedFacebookPage}
              />
            </div>
          </section>
        </div>
      )}

      {showScheduleModal && (
        <PublishScheduleModal
          scheduleDate={scheduleDate}
          onScheduleDateChange={setScheduleDate}
          onCancel={() => setShowScheduleModal(false)}
          onReview={() => openReview('schedule')}
        />
      )}

      {showReviewModal && (
        <PublishReviewModal
          mode={reviewMode}
          scheduleDate={scheduleDate}
          channels={selectedChannelList}
          channelContents={channelContents}
          fallbackContent={sharedContent || content}
          files={files}
          platformState={platformState}
          accounts={accounts}
          facebookPage={selectedFacebookPage}
          busy={uploading || publishing}
          onClose={() => setShowReviewModal(false)}
          onConfirm={() => handleSubmit(reviewMode === 'schedule')}
        />
      )}
    </div>
  );
}