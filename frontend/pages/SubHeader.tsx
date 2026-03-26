// components/SubHeader.tsx
import React from "react";
import styles from "../styles/subheader.module.css";

interface SubHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const tabs = ["Active Platforms","Create", "Templates", "Publish", "Schedule", "Analytics"];

const SubHeader: React.FC<SubHeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className={styles.subHeader}>
      <nav className={styles.tabNav}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${
              activeTab === tab ? styles.active : ""
            }`}
            onClick={() => setActiveTab(tab)}
            aria-current={activeTab === tab ? "page" : undefined}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SubHeader;
