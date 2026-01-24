// pages/_app.js
import '../styles/globals.css'; // ✅ This enables body resets, fonts, etc.
import React from 'react';

// Optional: add layout wrapper if needed
export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}