import React, { useState, useRef } from 'react';
import { Sparkles, Hash, FileText, Type, MessageSquarePlus, Copy, Loader, PlusCircle, X } from 'lucide-react';
import styles from '../styles/AIAssistant.module.css';
import axios from '../lib/axios';

const AIAssistant = () => {
  const [promptValue, setPromptValue] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeButton, setActiveButton] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [images, setImages] = useState<File[]>([]); // ✅ Array for multi-image carousel
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
    
    // ✅ Append all images to the same 'images' key for backend processing
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
      setImages((prev) => [...prev, ...selectedFiles].slice(0, 5)); // Limit to 5 for Llama Maverick
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const buttons = [
    { label: 'Generate Hashtags', icon: <Hash size={18} /> },
    { label: 'Generate Description', icon: <FileText size={18} /> },
    { label: 'Generate Caption', icon: <Type size={18} /> },
    { label: 'Generate Content', icon: <MessageSquarePlus size={18} /> },
  ];

  return (
    <div className={styles.aiAssistant}>
      <div className={styles.header}>
        <Sparkles size={20} className={styles.headerIcon} />
        <h3 className={styles.title}>AI Assistant (Llama 4)</h3>
      </div>

      <div className={styles.inputGroup}>
        <div className={styles.promptWrapper}>
          <button className={styles.uploadButton} onClick={() => fileInputRef.current?.click()}>
            <PlusCircle size={20} />
          </button>
          <input
            type="text"
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            placeholder="Topic for the carousel..."
            className={styles.promptInput}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple // ✅ Allow multiple selection
            style={{ display: 'none' }}
          />
        </div>

        {/* ✅ Carousel Preview */}
        {images.length > 0 && (
          <div className={styles.carouselContainer} style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '10px 0' }}>
            {images.map((file, idx) => (
              <div key={idx} style={{ position: 'relative', flex: '0 0 60px', height: '60px' }}>
                <img src={URL.createObjectURL(file)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                <button onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer' }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.buttonGrid}>
        {buttons.map(({ label, icon }) => (
          <button key={label} onClick={() => handleGenerate(label)} className={styles.generateButton} disabled={isLoading}>
            {isLoading && activeButton === label ? <Loader size={18} className={styles.loaderIcon} /> : icon}
            <span>{label.replace('Generate ', '')}</span>
          </button>
        ))}
      </div>

      {generatedContent && (
        <div className={styles.outputContainer}>
          <div className={styles.outputHeader}>
            <h4>Generated Results</h4>
            <button onClick={() => navigator.clipboard.writeText(generatedContent)} className={styles.copyButton}><Copy size={16} /></button>
          </div>
          <p style={{ whiteSpace: 'pre-wrap' }} className={styles.generatedText}>{generatedContent}</p>
        </div>
      )}
    </div>
  );
};

export default AIAssistant; // ✅ Ensure Default Export