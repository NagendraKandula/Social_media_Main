// frontend/components/AIAssistant.tsx
import React, { useState } from 'react';
import { ArrowUp, CornerDownRight, Sparkles } from 'lucide-react';
import { AiAnalysisResult, MediaItem } from '../types';
import apiClient from '../lib/axios'; // ✅ IMPORT YOUR AXIOS CLIENT
import styles from '../styles/AIAssistant.module.css';

const STARTER_PROMPTS = [
  { label: 'Brainstorm caption ideas', action: 'post ideas' },
  { label: 'Suggest relevant hashtags', action: 'hashtags' },
  { label: 'Find the best posting time', action: 'best time' },
  { label: 'Improve or shorten my text', action: 'improve text' },
];

interface Props {
  files: MediaItem[] | File[];
  content?: string;
  onAnalysisComplete: (result: AiAnalysisResult) => void;
  onApplyCaption: (caption: string) => void;
  onApplyHashtags: (hashtags: string[]) => void;
  onAutoSelectPlatforms: (platforms: any[]) => void;
}

export default function AIAssistant({ 
  files, 
  content = '',
  onAnalysisComplete, 
  onApplyCaption, 
  onApplyHashtags, 
  onAutoSelectPlatforms 
}: Props) {
  const [instructions, setInstructions] = useState('');
  const [action, setAction] = useState('post ideas');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    const existingText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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
    
    const promptContext = [existingText, instructions].filter(Boolean).join('\n\n');
    if (promptContext) formData.append('content', promptContext);
    formData.append('action', action);

    try {
      // ✅ FIX: Use apiClient instead of naked fetch
      const response = await apiClient.post('/ai/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const json = response.data;
      
      if (json.success) {
        setAnalysis(json.data);
        onAnalysisComplete(json.data); // Bubble up to Parent
      }
    } catch (error) {
      console.error("AI Analysis failed", error);
      alert("Failed to analyze content. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
        </div>
      </div>
    );
  }

  // frontend/components/AIAssistant.tsx

  if (analysis) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>✨ Analysis Complete</h3>
          <span className={styles.confidence}>
            {analysis.analysis?.engagementPrediction || 'Medium'} Engagement
          </span>
        </div>

        {/* ---------------- NEW STRATEGY SECTION ---------------- */}
        <div className={styles.section} style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <h4 className={styles.sectionTitle}>Content Strategy</h4>
          <div className={styles.textBlock} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p><strong>Summary:</strong> {analysis.analysis?.summary}</p>
            <p><strong>Vibe/Mood:</strong> {analysis.analysis?.mood}</p>
            <p><strong>Target Audience:</strong> {analysis.analysis?.audience}</p>
            <p><strong>Ideal Aspect Ratio:</strong> {analysis.analysis?.bestAspectRatio}</p>
            <p><strong>Best Time:</strong> {analysis.analysis?.bestPostingTime}</p>
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
        <strong>How can I help with your post?</strong>
        <p>Ask for ideas, rewrites, hashtags, timing, or feedback.</p>
      </div>

      <div className={styles.starterPrompts} aria-label="Suggested prompts">
        {STARTER_PROMPTS.map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => {
              setAction(item.action);
              setInstructions(item.label);
            }}
          >
            <CornerDownRight size={15} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.chatComposer}>
        <textarea
          placeholder="Ask AI Assistant"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleAnalyze();
            }
          }}
        />
        <button type="button" onClick={handleAnalyze} aria-label="Send to AI Assistant" title="Send">
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      </div>
      <small className={styles.disclaimer}>AI can make mistakes. Review suggestions before publishing.</small>
    </div>
  );
}
