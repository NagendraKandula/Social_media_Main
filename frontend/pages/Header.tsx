import Link from "next/link";
import styles from "../styles/Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>

        {/* Logo */}
        <div className={styles.logo}>
          Story<span className={styles.dot}>.</span>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <Link href="#">About</Link>
          <Link href="#">Features</Link>
          <Link href="#">Integrations</Link>
          <Link href="#">Pricing</Link>
          <Link href="#">Resources</Link>
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
          <Link href="/register" className={styles.login}>
            Sign Up
          </Link>
          <Link href="/login" className={styles.cta}>
            Log In
          </Link>
        </div>

      </div>
    </header>
  );
}
