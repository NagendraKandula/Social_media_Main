// components/Toolbar.tsx
import React from "react";
import styles from "../styles/Toolbar.module.css";

export default function Toolbar() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Create Post</h1>
      <div className={styles.actions}>
        <button className={styles.btnSecondary}>Undo</button>
        <button className={styles.btnSecondary}>Redo</button>
        <button className={styles.btnSecondary}>Share</button>
        <button className={styles.btnPrimary}>Download</button>
      </div>
    </header>
  );
}