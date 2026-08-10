import React from "react";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Smile,
  Sparkles,
  Underline,
} from "lucide-react";
import styles from "../styles/ContentEditor.module.css";

interface ToolbarProps {
  activeFormats: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
  };
  charCount: number;
  maxLength?: number;
  overLimit?: boolean;
  showCharacterCount?: boolean;
  isReadOnly: boolean;
  onApplyCommand: (command: string) => void;
  onInsertLink: () => void;
  onInsertText: (text: string) => void;
  onToggleEmojiPicker: () => void;
  onOpenAIAssistant?: () => void;
}

export default function Toolbar({
  activeFormats,
  charCount,
  maxLength,
  overLimit,
  showCharacterCount = true,
  isReadOnly,
  onApplyCommand,
  onInsertLink,
  onInsertText,
  onToggleEmojiPicker,
  onOpenAIAssistant,
}: ToolbarProps) {
  const preserveSelection = (event: React.MouseEvent<HTMLButtonElement>) =>
    event.preventDefault();

  return (
    <div
      className={styles.toolbar}
      style={{ pointerEvents: isReadOnly ? "none" : "auto", opacity: isReadOnly ? 0.5 : 1 }}
    >
      <div className={styles.toolbarLeft}>
        <button type="button" className={activeFormats.bold ? styles.toolActive : ""} onMouseDown={preserveSelection} onClick={() => onApplyCommand("bold")} disabled={isReadOnly} aria-label="Bold" title="Bold"><Bold size={18} strokeWidth={2.4} /></button>
        <button type="button" className={activeFormats.italic ? styles.toolActive : ""} onMouseDown={preserveSelection} onClick={() => onApplyCommand("italic")} disabled={isReadOnly} aria-label="Italic" title="Italic"><Italic size={18} strokeWidth={2.4} /></button>
        <button type="button" className={activeFormats.underline ? styles.toolActive : ""} onMouseDown={preserveSelection} onClick={() => onApplyCommand("underline")} disabled={isReadOnly} aria-label="Underline" title="Underline"><Underline size={18} strokeWidth={2.4} /></button>
        <button type="button" onMouseDown={preserveSelection} onClick={onInsertLink} disabled={isReadOnly} aria-label="Add link" title="Add link"><LinkIcon size={18} strokeWidth={2.4} /></button>
        <button type="button" onClick={() => onInsertText("#")} disabled={isReadOnly} aria-label="Add hashtag" title="Add hashtag">#</button>
        <button type="button" onClick={() => onInsertText("@")} disabled={isReadOnly} aria-label="Add mention" title="Add mention">@</button>
        <button type="button" onClick={onToggleEmojiPicker} disabled={isReadOnly} aria-label="Add emoji" title="Add emoji"><Smile size={18} strokeWidth={2.4} /></button>
      </div>

      {(showCharacterCount || onOpenAIAssistant) && <div className={styles.toolbarMeta}>
        {onOpenAIAssistant && (
          <button type="button" className={styles.aiAssistantButton} onClick={onOpenAIAssistant} disabled={isReadOnly} aria-label="Ask AI" title="Ask AI">
            <Sparkles size={18} aria-hidden="true" />
            <span>Ask AI</span>
          </button>
        )}
        {showCharacterCount && <span className={`${styles.charCount} ${overLimit ? styles.overLimit : ""}`}>
          {charCount}{maxLength ? ` / ${maxLength}` : ""} chars
        </span>}
      </div>}
    </div>
  );
}
