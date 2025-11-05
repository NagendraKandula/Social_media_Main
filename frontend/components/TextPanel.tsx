import React, { CSSProperties } from 'react';
import styles from '../styles/TextPanel.module.css';

// Define text style structure
export interface TextStyle {
  id: string;
  name: string;
  previewText: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  textAlign: CSSProperties['textAlign']; // ✅ FIXED — uses React’s native CSS type
  isPlus: boolean;
  category: 'simple' | 'font-pairs' | 'ai' | 'promotional';
}

// Mock text styles data
// Mock text styles data
const textStyles: { title: string; styles: TextStyle[] }[] = [ // ✅ Explicit typing added
  {
    title: "Simple",
    styles: [
      { id: 's1', name: 'Simple Bold', previewText: 'Hello', fontFamily: 'Arial', fontSize: 48, fontWeight: 'bold', color: '#000', textAlign: 'center', isPlus: false, category: 'simple' },
      { id: 's2', name: 'Simple Thin', previewText: 'Hello', fontFamily: 'Helvetica', fontSize: 48, fontWeight: 'normal', color: '#000', textAlign: 'center', isPlus: false, category: 'simple' },
      { id: 's3', name: 'Simple Serif', previewText: 'Hello', fontFamily: 'Georgia', fontSize: 48, fontWeight: 'normal', color: '#000', textAlign: 'center', isPlus: false, category: 'simple' },
    ],
  },
  {
    title: "Font pairs",
    styles: [
      { id: 'fp1', name: 'Dandelion Dreams', previewText: 'DANDELION DREAMS\nsince 1988', fontFamily: 'Playfair Display', fontSize: 36, fontWeight: 'bold', color: '#000', textAlign: 'center', isPlus: false, category: 'font-pairs' },
      { id: 'fp2', name: 'Dreamy Script', previewText: 'Your dreams are worth dreaming\ndon’t give up on them', fontFamily: 'Dancing Script', fontSize: 28, fontWeight: 'normal', color: '#000', textAlign: 'center', isPlus: true, category: 'font-pairs' },
      { id: 'fp3', name: 'Bold Quote', previewText: 'CAN’T BUY ME LOVE\nBut a Coach bag can work as well', fontFamily: 'Impact', fontSize: 32, fontWeight: 'bold', color: '#000', textAlign: 'center', isPlus: true, category: 'font-pairs' },
    ],
  },
  {
    title: "Powered by Ai",
    styles: [
      { id: 'ai1', name: 'Sweet Bubble', previewText: 'SWEET\nBANG\nBUBBLE', fontFamily: 'Poppins', fontSize: 36, fontWeight: 'bold', color: '#FF6B6B', textAlign: 'center', isPlus: true, category: 'ai' },
      { id: 'ai2', name: 'Sweet Caramelo', previewText: 'SWEET\nCARAMELO', fontFamily: 'Fredoka One', fontSize: 40, fontWeight: 'bold', color: '#FFA500', textAlign: 'center', isPlus: true, category: 'ai' },
      { id: 'ai3', name: 'Candy Twist', previewText: 'CANDY\nTWIST', fontFamily: 'Pacifico', fontSize: 44, fontWeight: 'normal', color: '#FF69B4', textAlign: 'center', isPlus: true, category: 'ai' },
    ],
  },
  {
    title: "Promotional",
    styles: [
      { id: 'p1', name: 'New Collection', previewText: 'NEW COLLECTION\nOUT NOW', fontFamily: 'Montserrat', fontSize: 28, fontWeight: 'bold', color: '#00FF00', textAlign: 'center', isPlus: false, category: 'promotional' },
      { id: 'p2', name: 'Sale Blast', previewText: 'SALE SALE SALE', fontFamily: 'Oswald', fontSize: 36, fontWeight: 'bold', color: '#000', textAlign: 'center', isPlus: true, category: 'promotional' },
      { id: 'p3', name: 'Wholesale', previewText: 'WHOLESALE', fontFamily: 'Raleway', fontSize: 40, fontWeight: 'bold', color: '#000', textAlign: 'center', isPlus: false, category: 'promotional' },
    ],
  },
];


interface TextPanelProps {
  onTextStyleSelect?: (style: TextStyle) => void;
}

const TextPanel: React.FC<TextPanelProps> = ({ onTextStyleSelect }) => {
  return (
    <div className={styles.panel}>
      {/* Add Text Button */}
      <button className={styles.addTextButton}>
        <span>➕</span> Add text
      </button>

      {/* Text Style Sections */}
      {textStyles.map((section, index) => (
        <div key={index} className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>{section.title}</h3>
            <button className={styles.seeMore}>See more</button>
          </div>
          <div className={styles.styleGrid}>
            {section.styles.map((style) => (
              <div
                key={style.id}
                className={styles.styleCard}
                onClick={() => onTextStyleSelect?.(style)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onTextStyleSelect?.(style);
                  }
                }}
              >
                {style.isPlus && <span className={styles.plusBadge}>PLUS</span>}
                <div
                  className={styles.previewText}
                  style={{
                    fontFamily: style.fontFamily,
                    fontSize: `${style.fontSize}px`,
                    fontWeight: style.fontWeight,
                    color: style.color,
                    textAlign: style.textAlign,
                    lineHeight: 1.2
                  }}
                >
                  {style.previewText}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TextPanel;