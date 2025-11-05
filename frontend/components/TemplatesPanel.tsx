// src/components/TemplatesPanel.tsx
import React from 'react';
import styles from '../styles/TemplatesPanel.module.css';

// Define template structure
export interface Template {
  id: string;
  title: string;
  imageUrl: string;
  isPlus: boolean;
  category: string;
}

// Mock template data — replace with real API later
const templateSections = [
  {
    title: 'Recommended for You',
    templates: [
      { id: 't1', title: 'Happy Halloween', imageUrl: 'https://via.placeholder.com/200/FF6B6B/FFFFFF?text=Halloween', isPlus: true, category: 'halloween' },
      { id: 't2', title: 'Let\'s drink & celebrate', imageUrl: 'https://via.placeholder.com/200/4ECDC4/FFFFFF?text=Birthday', isPlus: true, category: 'birthday' },
      { id: 't3', title: 'Halloween 2025', imageUrl: 'https://via.placeholder.com/200/96CEB4/FFFFFF?text=Pumpkin', isPlus: true, category: 'halloween' },
    ],
  },
  {
    title: 'Spooky Season Picks',
    templates: [
      { id: 't4', title: 'I\'m Gory to Glamorous', imageUrl: 'https://via.placeholder.com/200/FF6B6B/FFFFFF?text=Witch', isPlus: true, category: 'spooky' },
      { id: 't5', title: 'Our Halloween Makeup Artists Do It All', imageUrl: 'https://via.placeholder.com/200/4ECDC4/FFFFFF?text=Makeup', isPlus: true, category: 'beauty' },
      { id: 't6', title: 'Ghostly Vibes', imageUrl: 'https://via.placeholder.com/200/96CEB4/FFFFFF?text=Ghosts', isPlus: true, category: 'spooky' },
    ],
  },
  {
    title: 'Fall Favorites',
    templates: [
      { id: 't7', title: 'autumn days', imageUrl: 'https://via.placeholder.com/200/FF6B6B/FFFFFF?text=Autumn', isPlus: true, category: 'fall' },
      { id: 't8', title: 'autumn aesthetics', imageUrl: 'https://via.placeholder.com/200/4ECDC4/FFFFFF?text=Pumpkins', isPlus: true, category: 'fall' },
      { id: 't9', title: 'Hello Fall', imageUrl: 'https://via.placeholder.com/200/96CEB4/FFFFFF?text=Leaves', isPlus: true, category: 'fall' },
    ],
  },
  {
    title: 'Trendy',
    templates: [
      { id: 't10', title: 'Pastel Treats', imageUrl: 'https://via.placeholder.com/200/FF6B6B/FFFFFF?text=Macarons', isPlus: true, category: 'food' },
      { id: 't11', title: 'Artisan Bread', imageUrl: 'https://via.placeholder.com/200/4ECDC4/FFFFFF?text=Bread', isPlus: true, category: 'food' },
      { id: 't12', title: 'Cozy Coffee', imageUrl: 'https://via.placeholder.com/200/96CEB4/FFFFFF?text=Coffee', isPlus: true, category: 'lifestyle' },
    ],
  },
  {
    title: 'Business Cards for Print',
    templates: [
      { id: 't13', title: 'Maria Rowling', imageUrl: 'https://via.placeholder.com/200/FF6B6B/FFFFFF?text=Star', isPlus: false, category: 'business' },
      { id: 't14', title: 'Brand Identity', imageUrl: 'https://via.placeholder.com/200/4ECDC4/FFFFFF?text=Logo', isPlus: false, category: 'branding' },
      { id: 't15', title: 'Print Shots', imageUrl: 'https://via.placeholder.com/200/96CEB4/FFFFFF?text=Camera', isPlus: false, category: 'photography' },
    ],
  },
];

interface TemplatesPanelProps {
  onTemplateSelect?: (template: Template) => void;
}

const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ onTemplateSelect }) => {
  return (
    <div className={styles.panel}>
      {templateSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>{section.title}</h3>
            <button className={styles.seeMore} onClick={() => console.log(`See more ${section.title}`)}>
              See more
            </button>
          </div>
          <div className={styles.templateGrid}>
            {section.templates.map((template) => (
              <div
                key={template.id}
                className={styles.templateCard}
                onClick={() => onTemplateSelect?.(template)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onTemplateSelect?.(template);
                  }
                }}
              >
                {template.isPlus && <span className={styles.plusBadge}>PLUS</span>}
                <img src={template.imageUrl} alt={template.title} />
                <div className={styles.templateLabel}>{template.title}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplatesPanel;