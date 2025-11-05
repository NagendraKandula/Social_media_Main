import React, { useState } from "react";
import styles from "../styles/lheader.module.css";
import {
  FaInstagram,
  FaTwitter,
  FaFacebookF,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";
import { SiThreads } from "react-icons/si";
import { useRouter } from "next/router";
import apiClient from "../lib/axios"; // Import the apiClient

interface LHeaderProps {
  setActivePlatform: (platform: string | null) => void;
}

const LHeader: React.FC<LHeaderProps> = ({ setActivePlatform }) => {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // Use apiClient to send the logout request to the correct backend URL
     await apiClient.post("/auth/logout", {}, { withCredentials: true });

      
      // On success, redirect to the login page
      router.push("/login");
    } catch (error) {
      console.error("An error occurred during logout:", error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>☐ LOGO</div>

      <div className={styles.channels}>
        <button
          className={styles.channelIcon}
          data-platform="instagram"
          onClick={() => setActivePlatform("instagram")}
          aria-label="Instagram"
        >
          <span aria-hidden="true">
            <FaInstagram />
          </span>
        </button>
        <button
          className={styles.channelIcon}
          data-platform="twitter"
          onClick={() => setActivePlatform("twitter")}
          aria-label="Twitter"
        >
          <span aria-hidden="true">
            <FaTwitter />
          </span>
        </button>
        <button
          className={styles.channelIcon}
          data-platform="youtube"
          onClick={() => setActivePlatform("youtube")}
          aria-label="YouTube"
        >
          <span aria-hidden="true">
            <FaYoutube />
          </span>
        </button>
        <button
          className={styles.channelIcon}
          data-platform="linkedin"
          onClick={() => setActivePlatform("linkedin")}
          aria-label="LinkedIn"
        >
          <span aria-hidden="true">
            <FaLinkedinIn />
          </span>
        </button>
        <button
          className={styles.channelIcon}
          data-platform="facebook"
          onClick={() => setActivePlatform("facebook")}
          aria-label="Facebook"
        >
          <span aria-hidden="true">
            <FaFacebookF />
          </span>
        </button>
        <button
          className={styles.channelIcon}
          data-platform="threads"
          onClick={() => setActivePlatform("threads")}
          aria-label="Threads"
        >
          <span aria-hidden="true">
            <SiThreads />
          </span>
        </button>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.newPostButton}
          onClick={() => setActivePlatform(null)}
        >
          + New Post
        </button>
        <button className={styles.help} aria-label="Help">
          ?
        </button>

        {/* Profile Dropdown */}
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
              <button onClick={handleLogout} className={styles.logoutButton}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default LHeader;
