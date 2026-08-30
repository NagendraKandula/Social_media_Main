// frontend/components/AIAssistant.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, LoaderCircle, Sparkles, Star } from 'lucide-react';
import { AiAnalysisResult, MediaItem } from '../types';
import apiClient from '../lib/axios';
import styles from '../styles/AIAssistant.module.css';

interface Props {
  files: MediaItem[] | File[];
  content?: string;
  onAnalysisComplete: (result: AiAnalysisResult) => void;
  onAnalysisReset?: () => void;
  onResultControlsChange?: (controls: { onBack: () => void } | null) => void;
  onApplyCaption: (caption: string) => void;
  onApplyHashtags: (hashtags: string[]) => void;
  onAutoSelectPlatforms?: (platforms: any[]) => void;
  onApplyPlatformData?: (platformsData: any[]) => void; // 👈 1. Add to interface
  hideResultBackButton?: boolean;
}

export default function AIAssistant({ 
  files, 
  content = '',
  onAnalysisComplete, 
  onAnalysisReset,
  onResultControlsChange,
  onApplyCaption, 
  onApplyHashtags, 
  onAutoSelectPlatforms ,
  onApplyPlatformData,
  hideResultBackButton = false,
}: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [instruction, setInstruction] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const instructionInputRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeInstructionInput = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    if (!instruction && instructionInputRef.current) {
      instructionInputRef.current.style.height = 'auto';
    }
  }, [instruction]);

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
        if (file) formData.append('media', file);
      }
    }
    if (existingText) formData.append('content', existingText);
    formData.append('action', 'analyze_media');

    try {
      const response = await apiClient.post('/ai/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: abortController.signal,
      });
      
      const json = response.data;
      
      if (json.success) {
        const resultData = json.data;
        
        // 1. Set local state (in case they still want to chat/ask questions)
        setAnalysis(resultData);
        onAnalysisComplete(resultData); 

        // 2. IMMEDIATELY SEND TO DYNAMIC EDITOR
        const platformList = resultData.recommendedPlatforms || resultData.analysis?.recommendedPlatforms || [];
        
        if (platformList.length > 0) {
          // Auto-select the platform tabs in the UI
          onAutoSelectPlatforms?.(platformList);
          
          // Send the array to populate the editor's text areas (Fixed 'props.' reference)
          if (onApplyPlatformData) {
            onApplyPlatformData(platformList);
          }
        }
      }
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error("AI Analysis failed", error);
      alert(error?.response?.data?.message || "Failed to analyze content. Please try again.");
    } finally {
      if (abortControllerRef.current === abortController) abortControllerRef.current = null;
      setIsAnalyzing(false);
    }
    // Fixed dependency array here by replacing 'props' with 'onApplyPlatformData'
  }, [content, files, hasMedia, onAnalysisComplete, onAutoSelectPlatforms, onApplyPlatformData]);

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
        {!hideResultBackButton && !onResultControlsChange && (
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
        
        {/* ---------------- SUCCESS STATE ---------------- */}
        <div style={{ textAlign: 'center', padding: '2rem 0', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#5952cc' }}>
            <Sparkles size={36} aria-hidden="true" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
            Content Generated!
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: '1.5' }}>
            Platform-tailored captions and hashtags have been applied directly to your editor tabs.
          </p>
        </div>

        {/* ---------------- ASK AI / CHAT SECTION ---------------- */}
        <div className={styles.chatSection} style={{ marginTop: 'auto' }}>
          <h4 className={styles.sectionTitle}>Refine with AI</h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
            Need changes? Ask the AI to adjust the tone, length, or rewrite specific platforms.
          </p>
          <div className={styles.chatInputRow}>
            <textarea
              ref={instructionInputRef}
              rows={3}
              placeholder="e.g., Make the Twitter post punchier..."
              value={instruction}
              onChange={(e) => {
                setInstruction(e.target.value);
                resizeInstructionInput(e.currentTarget);
              }}
              className={styles.chatInput}
              disabled={isChatLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              aria-label="Refine with AI instruction"
            />
            <button
              type="button"
              onClick={handleChat}
              disabled={isChatLoading || !instruction.trim()}
              className={styles.chatButton}
              aria-label={isChatLoading ? "AI is responding" : "Send refinement"}
              title={isChatLoading ? "AI is responding" : "Send"}
            >
              {isChatLoading
                ? <LoaderCircle className={styles.chatButtonSpinner} size={18} aria-hidden="true" />
                : <ArrowUp size={19} strokeWidth={2.4} aria-hidden="true" />}
            </button>
            <span className={styles.chatStatus} role="status" aria-live="polite">
              {isChatLoading ? "AI is responding" : ""}
            </span>
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
