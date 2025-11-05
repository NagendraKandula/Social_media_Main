// src/pages/Create.tsx
import React, { useState } from 'react';
import styles from '../styles/Create.module.css';

// Components
import TemplatesPanel from '../components/TemplatesPanel';
import MainCanvas from '../components/MainCanvas';
import LayersPanel from '../components/LayersPanel';
import ResizePanel from '../components/ResizePanel';
import TextPanel from '../components/TextPanel'; // ✅ NEW IMPORT

// Icons
import { Layout, Copy, Upload, Type, Grid } from 'lucide-react';

// Import Template and TextStyle types
import { Template } from '../components/TemplatesPanel';
import { TextStyle } from '../components/TextPanel'; // ✅ NEW IMPORT

interface ToolbarItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const Create: React.FC = () => {
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [activePanel, setActivePanel] = useState<'templates' | 'layout' | 'text' | null>(null); // ✅ added 'text'

  // Handle toolbar clicks
  const handleTemplatesClick = () => {
    setActivePanel('templates');
    setShowLeftPanel(true);
  };

  const handleLayoutClick = () => {
    setActivePanel('layout');
    setShowLeftPanel(true);
  };

  const handleTextClick = () => { // ✅ new handler
    setActivePanel('text');
    setShowLeftPanel(true);
  };

  // Close any open panel
  const handleClosePanel = () => {
    setShowLeftPanel(false);
    setActivePanel(null);
  };

  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    console.log('Selected template:', template);
    handleClosePanel();
  };

  // Handle text style selection
  const handleTextStyleSelect = (style: TextStyle) => { // ✅ added
    console.log('Selected text style:', style);
    handleClosePanel();
  };

  const toolbarItems: ToolbarItem[] = [
    { label: 'Layout', icon: <Layout size={20} color="#4a4a4a" strokeWidth={2} />, onClick: handleLayoutClick },
    { label: 'Templates', icon: <Copy size={20} color="#4a4a4a" strokeWidth={2} />, onClick: handleTemplatesClick },
    { label: 'Text', icon: <Type size={20} color="#4a4a4a" strokeWidth={2} />, onClick: handleTextClick }, // ✅ updated
    { label: 'Elements', icon: <Grid size={20} color="#4a4a4a" strokeWidth={2} />, onClick: handleClosePanel },
    { label: 'Uploads', icon: <Upload size={20} color="#4a4a4a" strokeWidth={2} />, onClick: handleClosePanel },
  ];

  return (
    <div className={styles.container}>
      {/* Left Toolbar */}
      <div className={styles.toolbar}>
        {toolbarItems.map((item, index) => (
          <div
            key={index}
            className={styles.iconWrapper}
            onMouseEnter={() => setHoveredTooltip(item.label)}
            onMouseLeave={() => setHoveredTooltip(null)}
          >
            <button
              title={item.label}
              className={styles.iconButton}
              aria-label={item.label}
              onClick={item.onClick}
            >
              {item.icon}
            </button>
            {hoveredTooltip === item.label && (
              <span className={styles.tooltip}>{item.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* Left Panel */}
      {showLeftPanel && (
        <div className={styles.leftPanel}>
          {activePanel === 'templates' && (
            <TemplatesPanel onTemplateSelect={handleTemplateSelect} />
          )}
          {activePanel === 'layout' && (
            <ResizePanel onAdd={() => console.log('Add new layout')} />
          )}
          {activePanel === 'text' && ( // ✅ Show TextPanel
            <TextPanel onTextStyleSelect={handleTextStyleSelect} />
          )}
        </div>
      )}

      {/* Main Canvas Area */}
      <div className={styles.canvasWrapper}>
        <div className={styles.headerBar}>
          <select className={styles.pageSelector}>
            <option>Page 1 - Add Title</option>
            <option>Page 2</option>
            <option>Page 3</option>
          </select>
        </div>
        <MainCanvas />
      </div>

      {/* Right Sidebar */}
      <LayersPanel />
    </div>
  );
};

export default Create;
