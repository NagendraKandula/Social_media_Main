// frontend/components/AIAssistant.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import { AiAnalysisResult, MediaItem } from '../types';
import apiClient from '../lib/axios'; // ✅ IMPORT YOUR AXIOS CLIENT
import styles from '../styles/AIAssistant.module.css';

interface Props {
  files: MediaItem[] | File[];
  content?: string;
  onAnalysisComplete: (result: AiAnalysisResult) => void;
  onAnalysisReset?: () => void;
  onResultControlsChange?: (
    controls: { onBack: () => void; onRegenerate: () => void } | null
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
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
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
    
    // ✅ FIX: Loop through ALL files to support carousels/albums
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
      // ✅ FIX: Use apiClient instead of naked fetch
      const response = await apiClient.post('/ai/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: abortController.signal,
      });
      
      const json = response.data;
      
      if (json.success) {
        setAnalysis(json.data);
        onAnalysisComplete(json.data); // Bubble up to Parent
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
      onRegenerate: handleAnalyze,
    });

    return () => onResultControlsChange?.(null);
  }, [analysis, handleAnalyze, onResultControlsChange]);

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
            <li>✓ Crafting engaging caption</li>
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

  // frontend/components/AIAssistant.tsx

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
            <button
              type="button"
              className={styles.regenerateButton}
              onClick={handleAnalyze}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Regenerate
            </button>
          </div>
        )}
        {/* ---------------- NEW STRATEGY SECTION ---------------- */}
        <div className={`${styles.section} ${styles.strategySection}`}>
          <h4 className={styles.sectionTitle}>Content Strategy</h4>
          <div className={styles.strategyGrid}>
            <div className={styles.strategyItem}>
              <span>Theme</span>
              <strong>{analysis.analysis?.overallTheme || 'Not specified'}</strong>
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
          <div className={styles.storyBlock}>
            <span>Story</span>
            <p>{analysis.analysis?.story || 'No story summary generated.'}</p>
          </div>
        </div>

        {/* ---------------- CONTENT SECTION ---------------- */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Caption</h4>
          <p className={styles.textBlock}>
            {analysis.content?.caption || 'No caption generated.'}
            <br/><br/>
            {analysis.content?.cta && <strong>{analysis.content.cta}</strong>}
          </p>
          <button 
            onClick={() => {
              const fullText = `${analysis.content?.caption || ''}\n\n${analysis.content?.cta || ''}`;
              onApplyCaption(fullText.trim());
            }} 
            className={styles.btnApply}
          >
            Use Caption & CTA
          </button>
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Hashtags</h4>
          <p className={`${styles.textBlock} ${styles.hashtags}`}>
            {analysis.content?.hashtags?.join(' ') || '#social'}
          </p>
          <button 
            onClick={() => onApplyHashtags(analysis.content?.hashtags || [])} 
            className={styles.btnApply}
          >
            Use Hashtags
          </button>
        </div>

        <button 
          onClick={() => {
            const fullText = `${analysis.content?.caption || ''}\n\n${analysis.content?.cta || ''}`;
            onApplyCaption(fullText.trim());
            onApplyHashtags(analysis.content?.hashtags || []);
            onAutoSelectPlatforms(analysis.analysis?.recommendedPlatforms || []); 
          }} 
          className={styles.btnPrimary}
        >
          Apply All Recommendations
        </button>
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
            ? 'AI will review the uploaded media and suggest strategy, caption, hashtags, timing, and channels.'
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
