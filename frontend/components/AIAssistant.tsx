// frontend/components/AIAssistant.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Sparkles, Star } from 'lucide-react';
import { AiAnalysisResult, MediaItem } from '../types';
import apiClient from '../lib/axios';
import styles from '../styles/AIAssistant.module.css';

interface Props {
  files: MediaItem[] | File[];
  content?: string;
  onAnalysisComplete: (result: AiAnalysisResult) => void;
  onAnalysisReset?: () => void;
  onResultControlsChange?: (
    controls: { onBack: () => void } | null
  ) => void;
  onApplyCaption: (caption: string) => void;
  onApplyHashtags: (hashtags: string[]) => void;
  onAutoSelectPlatforms: (platforms: any[]) => void;
}

export default function AIAssistant({ 
  files, 
  content = '',
  onAnalysisComplete, 
  onAnalysisReset,
  onResultControlsChange,
  onApplyCaption, 
  onApplyHashtags, 
  onAutoSelectPlatforms 
}: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [instruction, setInstruction] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const mediaSignature = useMemo(() => {
    return files
      .map((item) => {
        const file = item instanceof File ? item : (item as any).file;
        if (file) return `${file.name}-${file.size}-${file.lastModified}`;

        const mediaItem = item as MediaItem;
        return `${mediaItem.id || mediaItem.name || mediaItem.url}-${mediaItem.size || 0}`;
      })
      .join('|');
  }, [files]);
  const hasMedia = mediaSignature.length > 0;

  const handleAnalyze = useCallback(async () => {
    if (!hasMedia) return;

    const existingText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsAnalyzing(true);
    const formData = new FormData();
    
    if (files.length > 0) {
      for (const item of files) {
        const file = item instanceof File ? item : (item as any).file;
        if (file) {
          formData.append('media', file);
        }
      }
    }
    
    if (existingText) formData.append('content', existingText);
    formData.append('action', 'analyze_media');

    try {
      const response = await apiClient.post('/ai/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: abortController.signal,
      });
      
      const json = response.data;
      
      if (json.success) {
        setAnalysis(json.data);
        onAnalysisComplete(json.data);
      }
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        return;
      }

      console.error("AI Analysis failed", error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to analyze content. Please try again.";
      alert(message);
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsAnalyzing(false);
    }
  }, [content, files, hasMedia, onAnalysisComplete]);

  const handleChat = useCallback(async () => {
    if (!analysis || !instruction.trim()) return;

    setIsChatLoading(true);

    const formData = new FormData();

    if (files.length > 0) {
      for (const item of files) {
        const file = item instanceof File ? item : (item as any).file;
        if (file) {
          formData.append("media", file);
        }
      }
    }

    formData.append("instruction", instruction);
    formData.append("currentAnalysis", JSON.stringify(analysis));

    try {
      const response = await apiClient.post("/ai/chat", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setAnalysis(response.data.data);
        onAnalysisComplete(response.data.data);
        setInstruction("");
      }
    } catch (error: any) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
        "Unable to update AI response."
      );
    } finally {
      setIsChatLoading(false);
    }
  }, [analysis, instruction, files, onAnalysisComplete]);

  const handleStopAnalysis = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsAnalyzing(false);
  };

  const handleBackToStart = () => {
    setAnalysis(null);
    onAnalysisReset?.();
  };

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsAnalyzing(false);
    setAnalysis(null);
    onAnalysisReset?.();
  }, [mediaSignature]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      onResultControlsChange?.(null);
    };
  }, []);

  useEffect(() => {
    if (!analysis) {
      onResultControlsChange?.(null);
      return;
    }

    onResultControlsChange?.({
      onBack: handleBackToStart,
    });

    return () => onResultControlsChange?.(null);
  }, [analysis, onResultControlsChange]);

  if (isAnalyzing) {
    return (
      <div className={styles.container}>
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner}></div>
          <p className="font-semibold">AI Assistant is thinking...</p>
          <ul className={styles.checklist}>
            <li>✓ Analyzing visual aesthetic</li>
            <li>✓ Evaluating aspect ratios</li>
            <li>✓ Checking platform suitability</li>
            <li>✓ Crafting platform-specific captions</li>
          </ul>
          <button
            type="button"
            className={styles.stopButton}
            onClick={handleStopAnalysis}
          >
            Stop
          </button>
        </div>
      </div>
    );
  }

  // Safely extract platforms array
  const platformList = analysis?.recommendedPlatforms || analysis?.analysis?.recommendedPlatforms || [];

  if (analysis) {
    return (
      <div className={styles.container}>
        {!onResultControlsChange && (
          <div className={styles.resultActions}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={handleBackToStart}
              aria-label="Back to AI analysis start"
              title="Back"
            >
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
          </div>
        )}
        
        {/* ---------------- CONTENT STRATEGY SUMMARY ---------------- */}
        <div className={`${styles.section} ${styles.strategySection}`}>
          <h4 className={styles.sectionTitle}>Campaign Strategy</h4>
          <div className={styles.strategyGrid}>
            <div className={styles.strategyItem}>
              <span>Theme</span>
              <strong>{analysis.analysis?.overallTheme || 'General'}</strong>
            </div>
            <div className={styles.strategyItem}>
              <span>Aspect Ratio</span>
              <strong>{analysis.analysis?.bestAspectRatio || 'Flexible'}</strong>
            </div>
            <div className={styles.strategyItem}>
              <span>Best Time</span>
              <strong>{analysis.analysis?.bestPostingTime || 'Anytime'}</strong>
            </div>
          </div>
          {analysis.analysis?.story && (
            <div className={styles.storyBlock}>
              <span>Storyline</span>
              <p>{analysis.analysis.story}</p>
            </div>
          )}
        </div>

        {/* ---------------- PLATFORM-SPECIFIC RECOMMENDATIONS ---------------- */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Platform-Specific Content</h4>
          
          {platformList.map((item: any, idx: number) => {
            const fullPlatformCaption = `${item.caption || ''}\n\n${item.cta || ''}`.trim();

            return (
              <div key={idx} className={styles.platformCard} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '15px' }}>{item.platform}</strong>
                  <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                    <Star size={14} fill="#f59e0b" /> {item.rating}/5
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                  <em>{item.reason}</em>
                </p>

                {/* Caption preview */}
              <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                  {item.caption}
                  {item.cta && <div style={{ marginTop: '6px', fontWeight: 'bold' }}>{item.cta}</div>}
                </div>

                {/* Hashtags */}
                {item.hashtags && item.hashtags.length > 0 && (
                  <p style={{ fontSize: '12px', color: '#2563eb', marginBottom: '8px' }}>
                    {item.hashtags.join(' ')}
                  </p>
                )}

                {/* Action Button to apply this specific platform's content */}
                <button 
                  onClick={() => {
                    onApplyCaption(fullPlatformCaption);
                    if (item.hashtags) onApplyHashtags(item.hashtags);
                  }} 
                  className={styles.btnApply}
                  style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                >
                  Use {item.platform} Copy & Hashtags
                </button>
              </div>
            );
          })}
        </div>

        {/* Apply All Button */}
        <button 
          onClick={() => {
            onAutoSelectPlatforms(platformList);
            if (platformList.length > 0) {
              const topChoice = platformList[0];
              const fullText = `${topChoice.caption || ''}\n\n${topChoice.cta || ''}`.trim();
              onApplyCaption(fullText);
              onApplyHashtags(topChoice.hashtags || []);
            }
          }} 
          className={styles.btnPrimary}
        >
          Auto-Select Platforms & Apply Top Recommendation
        </button>

        {/* ---------------- ASK AI / CHAT SECTION ---------------- */}
        <div className={styles.chatSection}>
          <h4 className={styles.sectionTitle}>Ask AI</h4>
          <div className={styles.chatInputRow}>
            <input
              type="text"
              placeholder="Ask AI to adjust character limits or tone..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className={styles.chatInput}
              disabled={isChatLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleChat();
                }
              }}
            />
            <button
              onClick={handleChat}
              disabled={isChatLoading || !instruction.trim()}
              className={styles.chatButton}
            >
              {isChatLoading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className={`${styles.container} ${styles.chatStart}`}>
      <div className={styles.welcome}>
        <Sparkles size={24} aria-hidden="true" />
        <strong>{hasMedia ? 'Ready to analyze your media' : 'Add media to start analysis'}</strong>
        <p>
          {hasMedia
            ? 'AI will review the uploaded media and suggest strategy, platform-specific captions, hashtags, and limits.'
            : 'Upload an image or video in the editor, then run AI analysis when you are ready.'}
        </p>
      </div>

      <button
        type="button"
        className={styles.analyzeButton}
        onClick={handleAnalyze}
        disabled={!hasMedia}
      >
        <Sparkles size={18} aria-hidden="true" />
        Analyze with AI
      </button>
      <small className={styles.disclaimer}>AI can make mistakes. Review suggestions before publishing.</small>
    </div>
  );
}