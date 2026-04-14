import React, { useEffect } from "react";
import Header from "./Header";
import styles from "../styles/index.module.css";
import dynamic from "next/dynamic";
import HeroContainer from "./HeroContainer";
import MainContent from "./MainContent";

const HeroSection = dynamic(() => import("./HeroSection1"), { ssr: false });

export default function Home() {

  // 🔥 CLEAR CHAT IF NOT LOGGED IN
  useEffect(() => {
    if (localStorage.getItem("isLoggedIn") !== "active") {
      localStorage.removeItem("chat_landing");
      localStorage.removeItem("chat_login");
      localStorage.removeItem("chat_postlogin");
    }
  }, []);

  return (
    <>
      {/* Main UI */}
      <div className={styles.container}>
        <Header />
        <MainContent />
        <HeroContainer />
      </div>
    </>
  );
}