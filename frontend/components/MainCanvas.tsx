// src/components/MainCanvas.tsx
import React, { useState } from 'react';
import styles from '../styles/MainCanvas.module.css';

interface CanvasElement {
  id: string;
  type: 'image' | 'text' | 'shape';
  content?: string;
  src?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number,
}

const MainCanvas: React.FC = () => {
  const [elements, setElements] = useState<CanvasElement[]>([
    // Mock initial element (you’ll replace this with template data later)
    {
      id: 'element-1',
      type: 'text',
      content: 'Hello Fall',
      x: 100,
      y: 200,
      width: 200,
      height: 60,
    }
  ]);

  const handleDragStart = (e: React.DragEvent, elementId: string) => {
    e.dataTransfer.setData('text/plain', elementId);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const elementId = e.dataTransfer.getData('text/plain');
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 50; // offset for centering
    const y = e.clientY - rect.top - 30;

    setElements(prev =>
      prev.map(el =>
        el.id === elementId ? { ...el, x, y } : el
      )
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className={styles.canvas}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Color Swatches */}
      <div className={styles.colorSwatches}>
        <div className={styles.swatch} style={{ backgroundColor: '#D98B5A' }}></div>
        <div className={styles.swatch} style={{ backgroundColor: '#A66C4A' }}></div>
        <div className={styles.swatch} style={{ backgroundColor: '#7E3F3F' }}></div>
        <div className={styles.swatch} style={{ backgroundColor: '#5A5A40' }}></div>
      </div>

      {/* Render draggable elements */}
      {elements.map((el) => (
        <div
          key={el.id}
          className={styles.canvasElement}
          draggable
          onDragStart={(e) => handleDragStart(e, el.id)}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            width: el.width,
            height: el.height,
            background: el.type === 'text' ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
            border: '2px dashed #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'move',
            zIndex: el.zIndex || 1,
            padding: '8px',
            
          }}
        >
          {el.type === 'text' && <span>{el.content}</span>}
          {el.type === 'image' && <img src={el.src} alt="Element" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
      ))}

      {/* Placeholder text */}
      <div className={styles.placeholderText}>Drag elements here</div>
    </div>
  );
};

export default MainCanvas;