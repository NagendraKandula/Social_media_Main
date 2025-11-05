// components/Canvas.tsx
import React from "react";
import styles from "../styles/Canvas.module.css";

export default function Canvas() {
  return (
    <main className={styles.canvas}>
      <div className={styles.workspace}>
        <div className={styles.centeredStar}>⭐</div>
      </div>
    </main>
  );
}