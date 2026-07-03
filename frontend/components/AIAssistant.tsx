// frontend/components/AIAssistant.tsx
import React, { useState } from 'react';
import { AiAnalysisResult, MediaItem } from '../types';
import apiClient from '../lib/axios'; // ✅ IMPORT YOUR AXIOS CLIENT
import styles from '../styles/AIAssistant.module.css';

interface Props {
  files: MediaItem[] | File[];
  onAnalysisComplete: (result: AiAnalysisResult) => void;
  onApplyCaption: (caption: string) => void;
  onApplyHashtags: (hashtags: string[]) => void;
  onAutoSelectPlatforms: (platforms: any[]) => void;
}

export default function AIAssistant({ 
  files, 
  onAnalysisComplete, 
  onApplyCaption, 
  onApplyHashtags, 
  onAutoSelectPlatforms 
}: Props) {
  const [instructions, setInstructions] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (files.length === 0 && !instructions) {
      alert("Please upload an image/video or add instructions first.");
      return;
    }
    
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
    
    if (instructions) formData.append('content', instructions);

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
          <p className="font-semibold">✨ AI Co-Pilot is thinking...</p>
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
    <div className={styles.container}>
      <h3 className={styles.title}>✨ AI Co-Pilot</h3>
      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
        Upload media in the editor, optionally tell me what you want to achieve, and I'll strategize your post.
      </p>
      
      <textarea 
        placeholder="Optional instructions (e.g., 'Promote this as a luxury product')..."
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={3}
        style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.75rem', fontSize: '0.875rem' }}
      />
      
      <button 
        onClick={handleAnalyze} 
        className={styles.btnPrimary}
        disabled={files.length === 0 && !instructions}
        style={{ opacity: (files.length === 0 && !instructions) ? 0.5 : 1 }}
      >
        Analyze with AI
      </button>
    </div>
  );
}