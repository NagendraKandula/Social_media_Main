// src/components/ResizePanel.tsx
import React from 'react';
import styles from '../styles/ResizePanel.module.css';

// Define preset layouts
const layoutPresets = [
  { name: "Instagram Story", width: 1080, height: 1920, icon: "📱" },
  { name: "YouTube Thumbnail", width: 1280, height: 720, icon: "▶️" },
  { name: "Facebook Profile", width: 1080, height: 1080, icon: "📘" },
  { name: "Banner", width: 468, height: 60, icon: "▬" },
  { name: "Large Rectangle", width: 336, height: 280, icon: "▭" },
  { name: "LinkedIn Post", width: 1200, height: 628, icon: "💼" },
  { name: "X Post", width: 1200, height: 675, icon: "𝕏" },
  { name: "Billboard", width: 970, height: 250, icon: "📰" },
  { name: "Mobile Banner", width: 320, height: 50, icon: "📱" },
  { name: "Desktop Wallpaper", width: 1600, height: 900, icon: "🖥️" },
  { name: "Instagram Post", width: 1080, height: 1350, icon: "🖼️" },
  { name: "Instagram Square", width: 1080, height: 1080, icon: "🟦" },
];

interface ResizePanelProps {
  onAdd?: () => void;
}

const ResizePanel: React.FC<ResizePanelProps> = ({ onAdd }) => {
  return (
    <div className={styles.layoutPanel}>
      <h3>Custom size</h3>
      <div className={styles.sizeInputs}>
        <input type="number" defaultValue="1080" min="1" />
        <span className={styles.lockIcon}>🔒</span>
        <input type="number" defaultValue="1080" min="1" />
        <button className={styles.addButton} onClick={onAdd}>
          Add
        </button>
      </div>

      <div className={styles.searchBar}>
        <input placeholder="Search for ratios" />
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <h4>Marketplace</h4>
      <div className={styles.presetsGrid}>
        {layoutPresets.map((preset, idx) => (
          <div key={idx} className={styles.presetCard}>
            <div className={styles.presetIcon}>{preset.icon}</div>
            <div className={styles.presetName}>{preset.name}</div>
            <div className={styles.presetSize}>
              {preset.width} × {preset.height}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResizePanel;