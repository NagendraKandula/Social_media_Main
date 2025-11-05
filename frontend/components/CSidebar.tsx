// components/Sidebar.tsx
import React from "react";
import styles from "../styles/CSidebar.module.css";

export default function CSidebar() {
  return (
    <aside className={styles.csidebar}>
      <nav className={styles.nav}>
        <button className={styles.navItem}>Templates</button>
        <button className={styles.navItemActive}>Elements</button>
        <button className={styles.navItem}>Text</button>
        <button className={styles.navItem}>Uploads</button>
        <button className={styles.navItem}>Magic Media</button>
        <button className={styles.navItem}>Tools</button>
      </nav>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Recently used</h3>
        <div className={styles.grid4}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.placeholderItem}></div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Shapes</h3>
        <div className={styles.grid4}>
          {["■", "●", "▲", "—"].map((shape, i) => (
            <div key={i} className={styles.shape}>{shape}</div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Stickers</h3>
        <div className={styles.grid4}>
          {["😊", "❤️", "🎉", "⭐", "🔥", "👍", "💯", "✨"].map((sticker, i) => (
            <div key={i} className={styles.sticker}>{sticker}</div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Photos</h3>
        <div className={styles.grid2}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.photo}></div>
          ))}
        </div>
      </div>
    </aside>
  );
}