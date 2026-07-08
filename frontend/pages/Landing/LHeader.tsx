import React, { useState, useEffect } from "react";
import styles from "../../styles/LandingCSS/lheader.module.css";
import {
  FaInstagram,
  FaTwitter,
  FaFacebookF,
  FaLinkedinIn,
  FaYoutube,
  FaBell,
  FaCog,
  FaQuestionCircle,
  FaChevronDown,
} from "react-icons/fa";
import { SiThreads } from "react-icons/si";
import { useRouter } from "next/router";
import apiClient from "../../lib/axios";
import {
  AppNotification,
  clearNotifications,
  getNotifications,
  markAllNotificationsRead,
  NOTIFICATIONS_UPDATED_EVENT,
} from "../../utils/notifications";

import InstagramConnect from "./Connect/InstagramConnect";
import FacebookConnect from "./Connect/FacebookConnect";
import YouTubeConnect from "./Connect/YouTubeConnect";
import TwitterConnect from "./Connect/TwitterConnect";
import LinkedInConnect from "./Connect/LinkedInConnect";
import ThreadsConnect from "./Connect/ThreadsConnect";

interface LHeaderProps {
  setActivePlatform: (platform: string | null) => void;
}

type ConnectedMap = {
  instagram?: boolean;
  facebook?: boolean;
  youtube?: boolean;
  twitter?: boolean;
  linkedin?: boolean;
  threads?: boolean;
};

type PopupType =
  | "instagram"
  | "facebook"
  | "youtube"
  | "twitter"
  | "linkedin"
  | "threads"
  | null;

type UserProfile = {
  email?: string;
};

const LHeader: React.FC<LHeaderProps> = () => {
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activePopup, setActivePopup] = useState<PopupType>(null);
  const [profileInitial, setProfileInitial] = useState("A");
  const [connectedPlatforms, setConnectedPlatforms] =
    useState<ConnectedMap>({});

  const getInitialFromEmail = (email?: string) => {
    const firstCharacter = email?.trim().charAt(0);
    return firstCharacter ? firstCharacter.toUpperCase() : "A";
  };

  const loadNotifications = () => {
    setNotifications(getNotifications());
  };

  const formatNotificationTime = (createdAt: string) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const elapsedMinutes = Math.max(1, Math.floor(elapsedMs / 60000));

    if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `${elapsedHours}h ago`;

    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays}d ago`;
  };

  const fetchUserProfile = async () => {
    try {
      const res = await apiClient.get<UserProfile>("/auth/profile");
      setProfileInitial(getInitialFromEmail(res.data?.email));
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  /* ================= FETCH CONNECTED PLATFORMS ================= */
  const fetchConnectedPlatforms = async () => {
  try {
    const res = await apiClient.get("/auth/social/active-accounts");
    const connected: ConnectedMap = {};

    Object.entries(res.data || {}).forEach(([key, value]) => {
      if (value) {
        connected[key as keyof ConnectedMap] = true;
      }
    });

    setConnectedPlatforms(connected);
  } catch (error) {
    console.error("Failed to fetch connected platforms:", error);
  }
};


  /* ================= INITIAL LOAD + LIVE SYNC ================= */
  useEffect(() => {
    fetchUserProfile();
    fetchConnectedPlatforms();
    loadNotifications();

    const handleUpdate = () => {
      fetchConnectedPlatforms();
    };

    window.addEventListener("social-accounts-updated", handleUpdate);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, loadNotifications);

    return () => {
      window.removeEventListener("social-accounts-updated", handleUpdate);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, loadNotifications);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout", {}, { withCredentials: true });
      router.push("/Auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const togglePopup = (popup: PopupType) => {
    setActivePopup((prev) => (prev === popup ? null : popup));
  };

  const toggleNotifications = () => {
    setNotificationsOpen((open) => {
      const nextOpen = !open;

      if (nextOpen) {
        markAllNotificationsRead();
        setDropdownOpen(false);
      }

      return nextOpen;
    });
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <header className={styles.header}>
      {/* Logo */}
      <div className={styles.logo}>
        SOci
      </div>

      {/* Platforms */}
      <div className={styles.channels}>
        {/* Instagram */}
        <div className={styles.iconWrapper}>
          <button
            data-platform="instagram"
            aria-label="Open Instagram connection"
            className={`${styles.channelIcon} ${
              connectedPlatforms.instagram ? styles.connected : ""
            }`}
            onClick={() => togglePopup("instagram")}
          >
            <FaInstagram />
          </button>
          {activePopup === "instagram" && (
            <InstagramConnect onClose={() => setActivePopup(null)} />
          )}
        </div>

        {/* Twitter */}
        <div className={styles.iconWrapper}>
          <button
            data-platform="twitter"
            aria-label="Open X connection"
            className={`${styles.channelIcon} ${
              connectedPlatforms.twitter ? styles.connected : ""
            }`}
            onClick={() => togglePopup("twitter")}
          >
            <FaTwitter />
          </button>
          {activePopup === "twitter" && (
            <TwitterConnect onClose={() => setActivePopup(null)} />
          )}
        </div>

        {/* YouTube */}
        <div className={styles.iconWrapper}>
          <button
            data-platform="youtube"
            aria-label="Open YouTube connection"
            className={`${styles.channelIcon} ${
              connectedPlatforms.youtube ? styles.connected : ""
            }`}
            onClick={() => togglePopup("youtube")}
          >
            <FaYoutube />
          </button>
          {activePopup === "youtube" && (
            <YouTubeConnect onClose={() => setActivePopup(null)} />
          )}
        </div>

        {/* LinkedIn */}
        <div className={styles.iconWrapper}>
          <button
            data-platform="linkedin"
            aria-label="Open LinkedIn connection"
            className={`${styles.channelIcon} ${
              connectedPlatforms.linkedin ? styles.connected : ""
            }`}
            onClick={() => togglePopup("linkedin")}
          >
            <FaLinkedinIn />
          </button>
          {activePopup === "linkedin" && (
            <LinkedInConnect onClose={() => setActivePopup(null)} />
          )}
        </div>

        {/* Facebook */}
        <div className={styles.iconWrapper}>
          <button
            data-platform="facebook"
            aria-label="Open Facebook connection"
            className={`${styles.channelIcon} ${
              connectedPlatforms.facebook ? styles.connected : ""
            }`}
            onClick={() => togglePopup("facebook")}
          >
            <FaFacebookF />
          </button>
          {activePopup === "facebook" && (
            <FacebookConnect onClose={() => setActivePopup(null)} />
          )}
        </div>

        {/* Threads */}
        <div className={styles.iconWrapper}>
          <button
            data-platform="threads"
            aria-label="Open Threads connection"
            className={`${styles.channelIcon} ${
              connectedPlatforms.threads ? styles.connected : ""
            }`}
            onClick={() => togglePopup("threads")}
          >
            <SiThreads />
          </button>
          {activePopup === "threads" && (
            <ThreadsConnect onClose={() => setActivePopup(null)} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.help}
          onClick={() => window.dispatchEvent(new Event("story-open-help"))}
          aria-label="Open help assistant"
          title="Help"
        >
          <FaQuestionCircle />
        </button>

        <div className={styles.notificationContainer}>
          <button
            className={styles.notification}
            onClick={toggleNotifications}
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className={styles.notificationBadge}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className={styles.notificationDropdown}>
              <div className={styles.notificationHeader}>
                <div>
                  <h3>Notifications</h3>
                  <p>{notifications.length} recent alerts</p>
                </div>

                {notifications.length > 0 && (
                  <button
                    type="button"
                    className={styles.clearNotifications}
                    onClick={clearNotifications}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className={styles.notificationList}>
                {notifications.length === 0 ? (
                  <div className={styles.emptyNotifications}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`${styles.notificationItem} ${
                        styles[`notification-${notification.type}`]
                      }`}
                    >
                      <span className={styles.notificationDot} />
                      <div>
                        <div className={styles.notificationTitleRow}>
                          <strong>{notification.title}</strong>
                          <span>
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        </div>
                        <p>{notification.message}</p>
                        {notification.details && notification.details.length > 0 && (
                          <div className={styles.notificationDetails}>
                            {notification.details.map((detail) => (
                              <span key={`${notification.id}-${detail.label}`}>
                                <strong>{detail.label}</strong>
                                {detail.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.settings}
          aria-label="Open settings"
          title="Settings"
        >
          <FaCog />
        </button>

        <div className={styles.profileContainer}>
          <button
            className={styles.profileControl}
            onClick={() => setDropdownOpen((o) => !o)}
            aria-label="Open profile menu"
            aria-expanded={dropdownOpen}
          >
            <span className={styles.profilePic}>
              <span className={styles.profileInitial}>{profileInitial}</span>
            </span>
            <FaChevronDown
              className={`${styles.profileChevron} ${dropdownOpen ? styles.profileChevronOpen : ""}`}
              aria-hidden="true"
            />
          </button>

          {dropdownOpen && (
            <div className={styles.profileDropdown}>
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default LHeader;
