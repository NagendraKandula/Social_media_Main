import React, { useState, useEffect, useMemo } from 'react';
import styles from '../styles/Publish.module.css';
import ChannelSelector, { Channel } from '../components/ChannelSelector';
import ContentEditor from '../components/ContentEditor';
import PlatformFields, { PlatformState } from '../components/PlatformFields';
import { usePostCreation } from '../hooks/usePostCreation';
import apiClient from '../lib/axios';
import { resolveEditorRules } from '../utils/resolveEditorRules';

interface FacebookPage { id: string; name: string; }

export default function Publish() {
  const [content, setContent] = useState(""); 
  const [files, setFiles] = useState<File[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());
  
  // ✅ Scheduling State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(""); // ISO String

  // Unified State for platform options
  const [platformState, setPlatformState] = useState<PlatformState>({
    facebookPostType: 'feed',
    instagramPostType: 'post',
    youtubeType: 'video',
    youtubeVisibility: 'public'
  });

  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const { uploadMedia, createPost, uploading, publishing } = usePostCreation();

  // 1. Calculate Editor Rules
  const selectedChannelList = useMemo(() => Array.from(selectedChannels), [selectedChannels]);
  const effectiveRules = useMemo(() => resolveEditorRules(selectedChannelList as any), [selectedChannelList]);

  // 2. Fetch Facebook Pages
  useEffect(() => {
    if (selectedChannels.has('facebook')) {
      apiClient.get('/facebook/pages')
        .then(({ data }) => {
          setFacebookPages(data);
          if (data.length > 0) {
             setPlatformState(prev => ({ ...prev, facebookPageId: data[0].id }));
          }
        })
        .catch(err => console.error("FB Pages Error:", err));
    }
  }, [selectedChannels]);

  // 3. Main Submit Function (Handles "Publish Now" AND "Schedule")
  const handleSubmit = async (isScheduled: boolean) => {
    if (selectedChannels.size === 0) return alert("Select a channel.");
    if (!content && files.length === 0) return alert("Add content or media.");

    // Validation
    if (selectedChannels.has('facebook') && !platformState.facebookPageId) {
      return alert("Please select a Facebook Page.");
    }
    if (selectedChannels.has('youtube') && !platformState.youtubeTitle) {
      return alert("YouTube requires a Title.");
    }

    // ✅ Scheduling Validation
    if (isScheduled && !scheduleDate) {
        return alert("Please select a date and time to schedule.");
    }

    try {
      // A. Upload Media
      let mediaData = { publicUrl: "", storagePath: "" };
      if (files.length > 0) {
        mediaData = await uploadMedia(files[0]);
      }
    };

      // B. Construct Payload
      const payload = {
        content: content,
        mediaUrl: mediaData.publicUrl || "",      
        storagePath: mediaData.storagePath || "", 
        mimeType: files[0]?.type || "",
        mediaType: files[0]?.type.startsWith('video') ? 'VIDEO' : 'IMAGE', 
        platforms: Array.from(selectedChannels),
        
        // ✅ SEND SCHEDULE TIME TO BACKEND
        scheduledAt: isScheduled ? new Date(scheduleDate).toISOString() : null,
        
        contentMetadata: {
          text: content,
          title: platformState.youtubeTitle, 
          platformOverrides: {
            facebook: { 
              pageId: platformState.facebookPageId,
              postType: platformState.facebookPostType 
            },
            instagram: {
              postType: platformState.instagramPostType 
            },
            youtube: {
              title: platformState.youtubeTitle,
              visibility: platformState.youtubeVisibility,
              postType: platformState.youtubeType 
            },
            twitter: {}
          }
        }
      };

      await createPost(payload);
      
      const successMsg = isScheduled 
        ? `Post Scheduled for ${new Date(scheduleDate).toLocaleString()}! 📅` 
        : "Post Published Successfully! 🚀";
      
      alert(successMsg);
      
      // Cleanup
      setContent('');
      setFiles([]);
      setSelectedChannels(new Set());
      setScheduleDate("");
      setShowScheduleModal(false);

    } catch (err: any) {
      console.error("Error:", err);
      alert(`Error: ${err.message || "Failed"}`);
    }
  };

  return (
    <div className={styles.publishPage}>
      {/* LEFT SIDEBAR */}
      <aside className={styles.leftPanel}>
        <ChannelSelector
          selectedChannels={selectedChannels}
          onSelectionChange={setSelectedChannels}
          connectedAccounts={connectedAccounts}
        />
      </aside>

      <div className={styles.editorPreviewContainer}>
        <div className={styles.leftPanel}>
          
          <ChannelSelector
            selectedChannels={selectedChannels}
            onSelectionChange={setSelectedChannels}
          />

          <PlatformFields 
             selectedChannels={selectedChannels}
             platformState={platformState}
             setPlatformState={setPlatformState}
             facebookPages={facebookPages}
          />

          <ContentEditor
            content={content}
            onContentChange={setContent}
            files={files}
            onFilesChange={setFiles}
            aiAssistantEnabled={false} 
            setAiAssistantEnabled={() => {}}
            effectiveRules={effectiveRules}
            validation={{}}
            
            // ✅ Connect Buttons to Actions
            onPublish={() => handleSubmit(false)} // Publish Immediately
            onSchedule={() => setShowScheduleModal(true)} // Open Modal
            onSaveDraft={() => alert("Draft saved! (Demo)")}
          />

          {/* ✅ Simple Schedule Modal */}
          {showScheduleModal && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: 'white', padding: '2rem', borderRadius: '12px',
                    width: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}>
                    <h3>Pick a Date & Time</h3>
                    <input 
                        type="datetime-local" 
                        style={{ width: '100%', padding: '10px', margin: '15px 0', fontSize: '16px' }}
                        onChange={(e) => setScheduleDate(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button 
                            onClick={() => setShowScheduleModal(false)}
                            style={{ padding: '8px 16px', border: '1px solid #ccc', background: 'white', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => handleSubmit(true)}
                            disabled={!scheduleDate || uploading || publishing}
                            style={{ padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            {publishing ? "Scheduling..." : "Confirm Schedule"}
                        </button>
                    </div>
                </div>
            </div>
          )}

        </div>
      </aside>
    </div>
  );
}