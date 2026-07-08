import React, { useState, useEffect } from 'react';
import apiClient from '../lib/axios';
import styles from '../styles/AIAssistant.module.css';
import { AiAnalysisResult, MediaItem } from '../types';

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
  
  // Premium Loading State
  const [loadingStep, setLoadingStep] = useState('');
  const [progress, setProgress] = useState(0);
  
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);

  // Drive the loading animation
  useEffect(() => {
    if (!isAnalyzing) {
      setProgress(0);
      return;
    }

    const steps = [
      'Analyzing image...',
      'Understanding context...',
      'Generating captions...',
      'Selecting platforms...'
    ];
    
    let currentStep = 0;
    setLoadingStep(steps[0]);
    setProgress(15); // Start with a small chunk

    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep < steps.length) {
        setLoadingStep(steps[currentStep]);
        // Increment progress, but cap it at 90% until the API actually finishes
        setProgress((prev) => Math.min(prev + 25, 90)); 
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleAnalyze = async () => {
    if (files.length === 0 && !instructions) return;
    
    setIsAnalyzing(true);
    const formData = new FormData();
    
    for (const item of files) {
      const file = item instanceof File ? item : (item as any).file;
      if (file) formData.append('media', file);
    }
    if (instructions) formData.append('content', instructions);

    try {
      const response = await apiClient.post('/ai/generate', formData);
      setProgress(100); // Snap to 100% right before rendering results
      
      // Wait a tiny bit so the user sees the 100% bar before the UI swaps
      setTimeout(() => {
        const json = response.data?.data || response.data;
        setAnalysis(json);
        onAnalysisComplete(json);
        setIsAnalyzing(false);
      }, 300);
      
    } catch (error) {
      console.error("Analysis failed", error);
      alert("AI Analysis failed. Check console for details.");
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p className={styles.loadingText}>✨ {loadingStep}</p>
          <div className={styles.progressBarBg}>
            <div 
              className={styles.progressBarFill} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (analysis) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h3 className={styles.title}>✨ Analysis Complete</h3>
              <span className={styles.confidence}>
                {analysis.analysis?.engagementPrediction || 'Medium'} Engagement
              </span>
            </div>
            {/* ✅ NEW: Regenerate Button */}
            <button 
              onClick={handleAnalyze} 
              className={styles.btnSecondary}
              title="Run analysis again"
            >
              ↻ Regenerate
            </button>
          </div>
        </div>

        {/* --- WHAT THE AI SAW --- */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Media Understood</h4>
          <ul style={{ fontSize: '0.875rem', color: '#4b5563', paddingLeft: '0', listStyle: 'none', margin: 0 }}>
            {analysis.analysis?.mediaSummary?.map((item, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>
                ✔ <strong>Image {item.index}:</strong> {item.description}
              </li>
            ))}
          </ul>
        </div>

        {/* --- STRATEGY --- */}
        <div className={styles.section} style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <h4 className={styles.sectionTitle}>Content Strategy</h4>
          <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ margin: 0 }}><strong>Theme:</strong> {analysis.analysis?.overallTheme}</p>
            <p style={{ margin: 0 }}><strong>Story:</strong> {analysis.analysis?.story}</p>
            <p style={{ margin: 0 }}><strong>Best Time:</strong> {analysis.analysis?.bestPostingTime}</p>
          </div>
        </div>

        {/* --- CONTENT --- */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Caption</h4>
          <p className={styles.textBlock}>
            {analysis.content?.caption}
            <br/><br/>
            <strong>{analysis.content?.cta}</strong>
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
      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
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