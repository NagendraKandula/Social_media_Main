// components/Topbar.tsx
import React, { useState } from "react";
import styles from "../styles/topbar.module.css";
import { FaCog, FaBell } from "react-icons/fa";
import { useRouter } from "next/router";
import apiClient from "../lib/axios";

const Topbar: React.FC = () => {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      console.log("Logout clicked");

      await apiClient.post("/auth/logout", {}, { withCredentials: true });
      window.location.href = "/login";

    } catch (error) {
      console.error("An error occurred during logout:", error);
    }
  };

  // ✅ COMPONENT MUST RETURN JSX
  return (
    <header className={styles.topbar}>
      <div className={styles.logo}>Story.</div>

      <div className={styles.actions}>
        <button className={styles.iconBtn} aria-label="Settings">
          <FaCog />
        </button>

        <button className={styles.iconBtn} aria-label="Notifications">
          <FaBell />
        </button>

        <div className={styles.profileContainer}>
          <button
            className={styles.profilePic}
            aria-label="Profile"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className={styles.profileInitial}>U</span>
          </button>

          {dropdownOpen && (
            <div className={styles.profileDropdown}>
              <button
                onClick={handleLogout}
                className={styles.logoutButton}
                type="button"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
