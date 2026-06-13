import React, { useEffect } from "react";
import Header from "./Header";
import styles from "../../styles/HomeCSS/index.module.css";
import MainContent from "./MainContent";

export default function Home() {
  useEffect(() => {
    if (localStorage.getItem("isLoggedIn") !== "active") {
      localStorage.removeItem("chat_landing");
      localStorage.removeItem("chat_login");
      localStorage.removeItem("chat_postlogin");
    }
  }, []);

  return (
    <>
      <div className={styles.container}>
        <Header />
        <MainContent />
      </div>
    </>
  );
}
