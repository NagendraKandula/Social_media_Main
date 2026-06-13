// pages/_app.js
import '../styles/globals.css'; // ✅ This enables body resets, fonts, etc.
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store/store';

// Optional: add layout wrapper if needed
export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.removeItem('theme');
  }, []);

  return (
    <Provider store={store}>
      <Component {...pageProps} />
    </Provider>
  );
}
