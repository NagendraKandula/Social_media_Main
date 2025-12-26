// frontend/pages/Sidebar.tsx
import React, { useState } from "react";
import { useRouter } from "next/router";
import {
  FaPenNib,
  FaPaste,
  FaUpload,
  FaRegCalendarAlt,
  FaChartBar,
  FaRegLightbulb,
} from "react-icons/fa";
import styles from "../styles/sidebar.module.css";

interface SidebarProps {
  activeSegment: string;
  setActiveSegment: (segment: string) => void;
  activePlatform: string | null;
  setActivePlatform: (platform: string | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeSegment,
  setActiveSegment,
  activePlatform,
  setActivePlatform,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const segments = [
    { name: "Create", icon: <FaPenNib />, route: "/Create" },
    { name: "Templates", icon: <FaPaste />, route: "/Templates" },
    { name: "Publish", icon: <FaUpload />, route: "/Publish" },
    { name: "Planning", icon: <FaRegCalendarAlt />, route: "/Planning" },
    { name: "Analytics", icon: <FaChartBar />, route: "/Analytics" },
    { name: "Summary", icon: <FaRegLightbulb />, route: "/Summary" },
  ];

  const handleClick = (name: string, route: string) => {
    setActiveSegment(name); // set active segment
    router.push(route); // navigate to the route
  };

  return (
    <>
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
        <nav className={styles.radialSegments}>
          {segments.map((s) => (
            <button
              key={s.name}
              className={`${styles.segment} ${activeSegment === s.name ? styles.active : ""}`}
              onClick={() => handleClick(s.name, s.route)}
              aria-label={s.name}
            >
              <span className={styles.segmentIcon}>{s.icon}</span>
              {!collapsed && <span className={styles.segmentTitle}>{s.name}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Floating Toggle Button */}
      <button
        className={styles.sidebarToggle}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{ left: collapsed ? "60px" : "250px" }}
      >
        {collapsed ? "⟩" : "⟨"}
      </button>
    </>
  );
};

export default Sidebar;
