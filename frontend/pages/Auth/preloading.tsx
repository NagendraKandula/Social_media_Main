import { useEffect } from "react";
import { useRouter } from "next/router";
import apiClient from "../../lib/axios";
import styles from "../../styles/AuthCSS/Preloading.module.css";

const ACTIVE_ACCOUNTS_CACHE_KEY = "story_active_accounts";

export default function PreloadingPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      router.prefetch("/Landing");

      const minimumLoadTime = new Promise((resolve) =>
        window.setTimeout(resolve, 1800)
      );

      const accountsRequest = apiClient
        .get("/auth/social/active-accounts")
        .then((res) => {
          sessionStorage.setItem(
            ACTIVE_ACCOUNTS_CACHE_KEY,
            JSON.stringify(res.data)
          );
        })
        .catch((err) => {
          console.error("Failed to preload active accounts:", err);
        });

      await Promise.all([minimumLoadTime, accountsRequest]);

      if (isMounted) {
        router.replace("/Landing");
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main className={styles.page} aria-label="Loading dashboard">
      <div className={styles.loaderContent}>
        <h1 className={styles.logo}>
          Story<span>.</span>
        </h1>
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressFill} />
        </div>
      </div>
    </main>
  );
}
