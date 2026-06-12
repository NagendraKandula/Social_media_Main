import React from "react";
import Link from "next/link";
import styles from "../../styles/HomeCSS/MainContent.module.css";

export default function MainContent() {
  return (
    <div className={styles.mainContent}>
      <div className={styles.contentWrapper}>

        <div className={styles.textContent}>
          <h1 className={styles.heading}>
            One Story Across Every Platform
          </h1>
          <p className={styles.subheading}>
            Create, schedule, and 
            publish content across all your social channels from a single workspace.
          </p>
        </div>
      
        {/* CTA */}
        <Link href="/Auth/register" className={styles.ctaButton}>
          Get Started →
        </Link>

        <img
          src="/hero3.png"
          alt=""
          className={styles.heroImage}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
