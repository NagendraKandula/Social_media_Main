import React from "react";
import Link from "next/link";
import styles from "../../styles/HomeCSS/MainContent.module.css";

export default function MainContent() {
  return (
    <main className={styles.mainContent}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1 className={styles.heading}>Your social media workspace, beautifully connected.</h1>
          <p className={styles.subheading}>
            Plan posts, tailor content by channel, review AI suggestions, and schedule everything from one clear workspace.
          </p>

          <div className={styles.heroActions}>
            <Link href="/Auth/register" className={styles.ctaButton}>
              Start creating
            </Link>
            <Link href="/Auth/login" className={styles.secondaryButton}>
              Log in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
