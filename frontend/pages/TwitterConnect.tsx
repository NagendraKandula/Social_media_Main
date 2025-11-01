// frontend/pages/TwitterConnect.tsx
import React from 'react';
import Head from 'next/head';
import styles from '../styles/TwitterConnect.module.css'; // Assuming you have this CSS module

const TwitterConnect: React.FC = () => {
  // This is the backend endpoint we created
  const backendAuthorizeUrl = 'http://localhost:4000/twitter/authorize';

  const handleConnect = () => {
    // Simply redirect the user's window to the backend authorization URL.
    // The backend will handle the redirect to Twitter and the eventual
    // callback, setting cookies and redirecting back to the frontend.
    window.location.href = backendAuthorizeUrl;
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Connect Twitter</title>
        <meta name="description" content="Connect your Twitter account" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Connect Your Twitter Account</h1>
        <p className={styles.description}>
          You will be redirected to Twitter to authorize the application.
        </p>
        
        <button onClick={handleConnect} className={styles.connectButton}>
          Connect with Twitter
        </button>
      </main>
    </div>
  );
};

export default TwitterConnect;