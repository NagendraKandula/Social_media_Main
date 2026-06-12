"use client";

import Link from "next/link";
import styles from "../../styles/HomeCSS/Header.module.css";
import Chatbot from "../../components/Chatbot";
import { useRouter } from "next/router";

export default function Header() {
  const router = useRouter();

  const showLandingChatbot = router.pathname === "/" || router.pathname === "/home";

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
