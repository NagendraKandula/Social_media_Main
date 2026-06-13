"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import styles from "../../styles/HomeCSS/Header.module.css";
import { useRouter } from "next/router";

const Chatbot = dynamic(() => import("../../components/Chatbot"), {
  ssr: false,
});

export default function Header() {
  const router = useRouter();

  const showLandingChatbot = router.pathname === "/" || router.pathname === "/Home";

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerContainer}>

          <div className={styles.logo}>
            Story<span className={styles.dot}>.</span>
          </div>

          <nav className={styles.nav}>
            <Link href="#">About</Link>
            <Link href="#">Features</Link>
            <Link href="#">Integrations</Link>
            <Link href="#">Pricing</Link>
            <Link href="#">Resources</Link>
          </nav>

          <div className={styles.actions}>
            <Link href="/Auth/login" className={styles.login}>
              Log In
            </Link>
            <Link href="/Auth/register" className={styles.cta}>
              Sign Up
            </Link>
          </div>

        </div>
      </header>

      {showLandingChatbot && <Chatbot type="landing" />}
    </>
  );
}
