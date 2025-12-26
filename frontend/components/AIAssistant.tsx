import React, { useState, useRef } from 'react';
import { Sparkles, Hash, FileText, Type, MessageSquarePlus, Copy, Loader, PlusCircle } from 'lucide-react';
import styles from '../styles/AIAssistant.module.css';
import axios from '../lib/axios'; // Import the pre-configured axios instance

const AIAssistant = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeButton, setActiveButton] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // This function now calls your backend API
  const handleGenerate = async (type: string) => {
    if (!prompt && !image) {
      alert('Please enter a prompt or upload an image to generate content.');
      return;
    }

    setIsLoading(true);
    setActiveButton(type);
    setGeneratedContent('');
    setCopySuccess('');

    // FormData is used to send files and text together
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('type', type);
    if (image) {
      formData.append('image', image); // The field name 'image' must match the backend
    }

    try {
      // Make the API call to your NestJS backend
      const response = await axios.post('/ai-assistant/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update the state with the response from the backend
      if (response.data && response.data.success) {
        setGeneratedContent(response.data.data);
      } else {
        throw new Error('API response was not successful.');
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      // Display a user-friendly error message
      setGeneratedContent('Sorry, an error occurred while generating content. Please try again.');
    } finally {
      setIsLoading(false);
      setActiveButton('');
    }
  };

  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
    }
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
        <h3 className={styles.title}>AI Assistant</h3>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="ai-prompt">Your Topic or Prompt</label>
        <div className={styles.promptWrapper}>
          <button
            className={styles.uploadButton}
            aria-label="Upload image for context"
            onClick={handleUploadClick}
          >
            <PlusCircle size={20} />
          </button>
          <input
            id="ai-prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'A new coffee shop opening...'"
            className={styles.promptInput}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {image && (
          <div className={styles.imagePreviewContainer}>
            <img
              src={URL.createObjectURL(image)}
              alt="Preview"
              className={styles.imagePreview}
            />
            <button
              onClick={() => setImage(null)}
              className={styles.removeImageButton}
            >
              ✕
            </button>
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
            {isLoading && activeButton === label ? (
              <Loader size={18} className={styles.loaderIcon} />
            ) : (
              icon
            )}
            <span>{label.replace('Generate ', '')}</span>
          </button>
        ))}
      </div>

      {(isLoading || generatedContent) && (
        <div className={styles.outputContainer}>
          {isLoading ? (
            <div className={styles.loader}>
              <Loader size={20} className={styles.loaderIcon} />
              <span>Generating...</span>
            </div>
          ) : (
            <>
              <div className={styles.outputHeader}>
                <h4>Generated Content</h4>
                <button onClick={handleCopy} className={styles.copyButton}>
                  <Copy size={16} />
                  <span>{copySuccess || 'Copy'}</span>
                </button>
              </div>
              <p className={styles.generatedText}>{generatedContent}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAssistant;