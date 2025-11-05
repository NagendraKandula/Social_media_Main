// src/components/LayersPanel.tsx
import React from 'react';
import styles from '../styles/LayersPanel.module.css';

// Mock layer data (no real image paths)
const layers = [
  { id: 1, type: 'image', name: 'Pumpkin', visible: true, locked: false },
  { id: 2, type: 'image', name: 'Leaves', visible: true, locked: false },
  { id: 3, type: 'color', name: 'Background', color: '#5A5A40', visible: true, locked: false },
  { id: 4, type: 'color', name: 'Accent', color: '#D98B5A', visible: true, locked: true },
  { id: 5, type: 'color', name: 'Text BG', color: '#A66C4A', visible: false, locked: false },
];

const LayersPanel: React.FC = () => {
  return (
    <div className={styles.sidebar}>
      <h3>Page 1</h3>
      {layers.map((layer) => (
        <div key={layer.id} className={styles.layerItem}>
          {layer.type === 'image' ? (
            <div className={styles.imagePlaceholder}>
              📷
            </div>
          ) : (
            <div
              className={styles.colorPreview}
              style={{ backgroundColor: layer.color }}
            ></div>
          )}
          <div className={styles.layerInfo}>
            <div className={styles.layerName}>{layer.name}</div>
            <div className={styles.layerType}>{layer.type}</div>
          </div>
          <div className={styles.layerControls}>
            <button
              aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
              className={styles.visibilityButton}
            >
              {layer.visible ? '👁️' : '👁️‍🗨️'}
            </button>
            <button
              aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
              className={styles.lockButton}
            >
              {layer.locked ? '🔒' : '🔓'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LayersPanel;