import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Hash, 
  FileText, 
  Type, 
  MessageSquarePlus, 
  Copy, 
  Loader, 
  PlusCircle, 
  X, 
  Trash2 
} from 'lucide-react';
import styles from '../styles/AIAssistant.module.css';
import axios from '../lib/axios';

const AIAssistant = () => {
  const [promptValue, setPromptValue] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeButton, setActiveButton] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async (genType: string) => {
    if (!promptValue.trim() && images.length === 0) {
      alert('Please enter a prompt or upload images.');
      return;
    }

    setIsLoading(true);
    setActiveButton(genType);
    setGeneratedContent('');

    const formData = new FormData();
    formData.append('prompt', promptValue);
    formData.append('type', genType);
    
    images.forEach((file) => {
      formData.append('images', file); 
    });

    try {
      const response = await axios.post('/ai-assistant/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.success) {
        setGeneratedContent(response.data.data);
      }
    } catch (error: any) {
      console.error('AI Error:', error);
      setGeneratedContent("Error: " + (error.response?.data?.message || "Failed to reach server"));
    } finally {
      setIsLoading(false);
      setActiveButton('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...selectedFiles].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearResult = () => {
    setGeneratedContent('');
  };

  const buttons = [
    { label: 'Generate Hashtags', icon: <Hash size={16} /> },
    { label: 'Generate Description', icon: <FileText size={16} /> },
    { label: 'Generate Caption', icon: <Type size={16} /> },
    { label: 'Generate Content', icon: <MessageSquarePlus size={16} /> },
  ];

  return (
    <div className={styles.aiAssistant}>
      <div className={styles.header}>
        <Sparkles size={20} className={styles.headerIcon} />
        <h3 className={styles.title}>AI Assistant (Llama 4)</h3>
      </div>

      <div className={styles.inputGroup}>
        <div className={styles.promptWrapper}>
          <button 
            className={styles.uploadButton} 
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <PlusCircle size={20} />
          </button>
          
          <textarea
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            placeholder="Topic for the carousel..."
            className={styles.promptInput}
            rows={3}
          />
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
        </div>

        {images.length > 0 && (
          <div className={styles.carouselContainer}>
            {images.map((file, idx) => (
              <div key={idx} style={{ position: 'relative', flex: '0 0 60px', height: '60px' }}>
                <img 
                    src={URL.createObjectURL(file)} 
                    alt="preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} 
                />
                <button onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.buttonGrid}>
        {buttons.map(({ label, icon }) => (
          <button 
            key={label} 
            onClick={() => handleGenerate(label)} 
            className={styles.generateButton} 
            disabled={isLoading}
          >
            {isLoading && activeButton === label ? <Loader size={16} className={styles.loaderIcon} /> : icon}
            <span>{label.replace('Generate ', '')}</span>
          </button>
        ))}
      </div>

      {generatedContent && (
        <div className={styles.outputContainer}>
          <div className={styles.outputHeader}>
            <h4>Generated Results</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => navigator.clipboard.writeText(generatedContent)} 
                className={styles.copyButton}
                title="Copy text"
              >
                <Copy size={16} />
              </button>
              
              <button 
                onClick={clearResult} 
                className={styles.copyButton} 
                style={{ color: '#ef4444' }}
                title="Clear result"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className={styles.generatedText}>
            {generatedContent}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
