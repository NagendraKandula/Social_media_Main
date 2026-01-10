import React, { useState, useRef, useMemo, useEffect } from "react";
import { Bold, Italic, Underline, Link, Hash, AtSign, Smile, Send, Save, Clock } from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import styles from "../styles/ContentEditor.module.css";
// ✅ Import the rules type
import { EffectiveEditorRules } from "../utils/resolveEditorRules";

type ValidationMap = Record<string, string[]>;

export interface ContentEditorProps {
  content: string;
  onContentChange: (value: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  
  // ✅ AI Props
  aiAssistantEnabled: boolean;
  setAiAssistantEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  
  // ✅ Action Handlers (Restored)
  onPublish: () => void;
  onSaveDraft: () => void;
  onSchedule: () => void;

  // ✅ Validation Rules (Restored)
  effectiveRules: EffectiveEditorRules;
  validation: ValidationMap;
}

export default function ContentEditor({
  content,
  onContentChange,
  files,
  onFilesChange,
  aiAssistantEnabled,
  setAiAssistantEnabled,
  onPublish,
  onSaveDraft,
  onSchedule,
  effectiveRules,
  validation,
}: ContentEditorProps) {
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync content updates from parent
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      if (editorRef.current.innerText !== new DOMParser().parseFromString(content, 'text/html').body.innerText) {
         editorRef.current.innerHTML = content;
      }
    }
  }, [content]);

  // Handle manual typing
  const handleInput = () => {
    if (!editorRef.current) return;
    onContentChange(editorRef.current.innerHTML);
  };

  // Rich Text Commands
  const applyCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const filePreviews = useMemo(() => files.map(f => ({
      file: f, url: URL.createObjectURL(f), isImage: f.type.startsWith('image/')
  })), [files]);

  return (
    <div className={styles.editorCard}>
      {/* Header */}
      <div className={styles.editorHeader}>
        <span className={styles.editorTitle}>Content</span>
        <label className={styles.aiToggle}>
          <span>AI Assistant</span>
          <input 
            type="checkbox" 
            checked={aiAssistantEnabled} 
            onChange={(e) => setAiAssistantEnabled(e.target.checked)} 
          />
        </label>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
          <button onClick={() => applyCommand('bold')} title="Bold"><Bold size={16}/></button>
          <button onClick={() => applyCommand('italic')} title="Italic"><Italic size={16}/></button>
          <button onClick={() => applyCommand('underline')} title="Underline"><Underline size={16}/></button>
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Emoji"><Smile size={16}/></button>
      </div>
      
      {showEmojiPicker && (
        <div className={styles.emojiPopover}>
          <EmojiPicker onEmojiClick={(e) => {
             document.execCommand('insertText', false, e.emoji);
             setShowEmojiPicker(false);
          }} />
        </div>
      )}

      {/* Editor Area */}
      <div 
        className={styles.editor} 
        contentEditable 
        ref={editorRef}
        onInput={handleInput} 
        suppressContentEditableWarning
      />

      {/* Character Counter & Rules */}
      <div className={styles.footerInfo}>
        <span style={{ 
            color: effectiveRules?.text?.maxLength && (editorRef.current?.innerText.length || 0) > effectiveRules.text.maxLength ? 'red' : 'inherit' 
        }}>
           {content.replace(/<[^>]*>/g, '').length} 
           {effectiveRules?.text?.maxLength ? ` / ${effectiveRules.text.maxLength}` : ''} chars
        </span>
      </div>

      {/* Media Section */}
      <div className={styles.media}>
         <div className={styles.mediaGrid}>
            {filePreviews.map((p, i) => (
                <div key={i} className={styles.mediaItem}>
                    {p.isImage ? <img src={p.url} alt="preview" /> : <div className={styles.videoPlaceholder}>🎥</div>}
                    <button onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))}>×</button>
                </div>
            ))}
         </div>
         <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
            <span>+ Add Media</span>
            <input 
                type="file" multiple hidden ref={fileInputRef} 
                onChange={(e) => e.target.files && onFilesChange([...files, ...Array.from(e.target.files)])}
            />
         </div>
      </div>

      {/* ✅ Action Buttons (Restored) */}
      <div className={styles.actionButtons}>
        <button className={styles.draftBtn} onClick={onSaveDraft}>
          <Save size={16} /> Draft
        </button>
        <button className={styles.scheduleBtn} onClick={onSchedule}>
          <Clock size={16} /> Schedule
        </button>
        {/* Note: The main Publish button is now often handled by the parent page, 
            but we keep this prop if you want the button inside the editor */}
        <button className={styles.publishBtn} onClick={onPublish}>
          <Send size={16} /> Publish
        </button>
      </div>
    </div>
  );
}