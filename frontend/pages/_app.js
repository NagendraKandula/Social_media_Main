// pages/_app.js
import '../styles/globals.css'; // ✅ This enables body resets, fonts, etc.
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

const publicLightRoutes = new Set(['/', '/home', '/Auth/login', '/Auth/register']);

// Optional: add layout wrapper if needed
export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    if (publicLightRoutes.has(router.pathname)) {
      document.documentElement.setAttribute('data-theme', 'light');
      return;
    }

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', theme);
  }, [router.pathname]);

  return <Component {...pageProps} />;
}
