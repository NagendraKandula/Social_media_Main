import React from "react";
import Header from "./Header";
import styles from "../styles/index.module.css";
import dynamic from "next/dynamic";
import HeroContainer from "./HeroContainer";
import MainContent from "./MainContent";

const HeroSection = dynamic(() => import("./HeroSection1"), { ssr: false });

export default function Home() {
  return (
    <div className={styles.container}>
      <Header />
      <MainContent />
      <HeroContainer />
    </div>
  );
}