// Templates.jsx
import React from "react";
import styles from "../styles/Templates.module.css";

const Templates = () => {
  // Define template categories for the top navigation
  const categories = ["For You", "Social Media", "Web Design", "Print-ready", "Business & Personal"];

  // Define template data - each object represents one template card
  const templates = [
    { id: 1, name: "Custom Size", icon: "custom", type: "custom" },
    { id: 2, name: "Instagram Post", icon: "instagram", type: "post" },
    { id: 3, name: "Instagram Post Vertical", icon: "instagram", type: "post-vertical" },
    { id: 4, name: "Instagram Story", icon: "instagram", type: "story" },
    { id: 5, name: "Instagram Video Story", icon: "instagram", type: "video-story" },
    { id: 6, name: "Instagram Reel", icon: "reel", type: "reel" },
    { id: 7, name: "Instagram Highlight", icon: "instagram", type: "highlight" },
    { id: 8, name: "Instagram Reel Cover", icon: "reel-cover", type: "reel-cover" },
    { id: 9, name: "Instagram Ad", icon: "instagram", type: "ad" },
    { id: 10, name: "Facebook Post", icon: "facebook", type: "facebook" },
  ];

  return (
    <div className={styles.templatesContainer}>
      {/* Header Section */}
      <div className={styles.header}>
        <h2>Templates</h2>
        <p>Browse through ready-made templates for all your social platforms.</p>
      </div>

      {/* Category Navigation */}
      <div className={styles.categoryNav}>
        {categories.map((category, index) => (
          <button 
            key={index} 
            className={`${styles.categoryBtn} ${category === "Social Media" ? styles.activeCategory : ""}`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className={styles.templateGrid}>
        {templates.map((template) => (
          <div key={template.id} className={styles.templateCard}>
            <div className={styles.templatePreview}>
              {/* Placeholder for actual icons/images */}
              <div className={styles.iconPlaceholder}>
                {template.icon === "instagram" && (
                  <div className={styles.instagramIcon}>📷</div>
                )}
                {template.icon === "reel" && (
                  <div className={styles.reelIcon}>🎬</div>
                )}
                {template.icon === "reel-cover" && (
                  <div className={styles.reelCoverIcon}>📺</div>
                )}
                {template.icon === "facebook" && (
                  <div className={styles.facebookIcon}>📘</div>
                )}
                {template.icon === "custom" && (
                  <div className={styles.customIcon}>📐</div>
                )}
              </div>
              
              {/* Add social media interaction icons if needed */}
              {template.type !== "custom" && (
                <div className={styles.socialIcons}>
                  <span>❤️</span>
                  <span>💬</span>
                  <span>📤</span>
                  <span>🔖</span>
                </div>
              )}
              
              {/* Play button for video types */}
              {(template.type === "video-story" || template.type === "reel") && (
                <div className={styles.playButton}>▶️</div>
              )}
            </div>
            <div className={styles.templateLabel}>
              {template.name}
            </div>
          </div>
        ))}
        
        {/* Right Arrow Button (for scrolling) */}
        <div className={styles.arrowButton}>
          <span>➤</span>
        </div>
      </div>
    </div>
  );
};

export default Templates;