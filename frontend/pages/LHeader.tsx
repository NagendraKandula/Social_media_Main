// components/LHeader.tsx
import React from "react";
import styles from "../styles/lheader.module.css";
import Topbar from "./Topbar";
import Menubar from "./Menubar";

interface LHeaderProps {
  setActivePlatform: (platform: string | null) => void;
}

const LHeader: React.FC<LHeaderProps> = ({ setActivePlatform }) => {
  return (
    <div className={styles.container}>
      <Topbar />
      <Menubar setActivePlatform={setActivePlatform} />
    </div>
  );
};

export default LHeader;
