// frontend/pages/Sidebar.tsx
import React, { useState, useEffect, useRef } from "react";
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

  // --- Draggable Toggle State and Refs ---
  const [position, setPosition] = useState({ x: 30, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const movedRef = useRef(false); // Ref to check if a drag actually happened
  // ---------------------------------------

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

  // --- Draggable Toggle Effects & Handlers ---

  // Handle Dragging Movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Track movement to differentiate drag from click
        movedRef.current = true; 

        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Constrain to viewport (assuming button size is small, using 50px offset)
        const maxX = window.innerWidth - 50;
        const maxY = window.innerHeight - 50;

        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Start Drag
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (toggleRef.current) {
      movedRef.current = false; // Reset move tracking on mouse down
      const rect = toggleRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  // Handle Click (Toggle) for the draggable button
  const handleToggleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Only toggle if no significant movement occurred
    if (!movedRef.current) { 
      setCollapsed(false); // Draggable button always EXPANDS the sidebar
    }
  };
  // --------------------------------------------


  return (
    <>
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
        {/* Navigation Title added here */}
        {!collapsed && <h3 className={styles.navigationTitle}>Navigation</h3>}
        
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

      {/* 1. Internal Collapse Button (Fixed Position) - ONLY SHOW WHEN EXPANDED */}
      {!collapsed && ( // <--- CRITICAL FIX: Only render when NOT collapsed
        <button
          className={styles.sidebarToggle} 
          onClick={() => setCollapsed(true)} // This button's job is to COLLAPSE the sidebar
          aria-label="Collapse sidebar"
          // Position it to the right edge of the expanded sidebar (250px)
          style={{ left: "170px" }} 
        >
          {"⟨"} 
        </button>
      )}

      {/* 2. Draggable Toggle Button (Visible ONLY when collapsed) */}
      {collapsed && (
        <button
          ref={toggleRef}
          onMouseDown={handleMouseDown}
          onClick={handleToggleClick}
          className={`${styles.sidebarToggleDraggable} ${isDragging ? styles.grabbing : styles.grab}`}
          aria-label="Expand sidebar"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          {"☰"} 
        </button>
      )}
    </>
  );
};

export default Sidebar;