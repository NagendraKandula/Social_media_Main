import React from "react";
import styles from "../../styles/LandingCSS/subheader.module.css";

interface SubHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const tabs = ["Active Platforms", "Create", "Publish", "Schedule", "Analytics"];
const disabledTabs = new Set(["Analytics"]);

const SubHeader: React.FC<SubHeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className={styles.subHeader}>
      <nav className={styles.tabNav}>
        {tabs.map((tab) => {
          const isDisabled = disabledTabs.has(tab);

          return (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${
                activeTab === tab ? styles.active : ""
              } ${isDisabled ? styles.disabled : ""}`}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              title={isDisabled ? "Analytics is temporarily disabled" : undefined}
            >
              {tab}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SubHeader;
