import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import apiClient from "../lib/axios"; // already configured with withCredentials: true
import styles from "../styles/login.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Step 1: Send login credentials
      await apiClient.post("/auth/login", { email, password });

      // Step 2: Verify that cookies were actually stored
      await apiClient.get("/auth/profile");

      // Step 3: Redirect only after cookie is confirmed
      setMessage("Login successful!");
      router.push("/Landing");
    } catch (error: any) {
      console.error("Login or verification failed:", error);
      const errorMessage =
        error.response?.data?.message || "Login failed. Please try again.";
      setMessage(errorMessage);
      setLoading(false);
    }
  };

  const EyeIcon = () => (
    <svg
      height="25"
      width="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4877f5"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="12" rx="8" ry="5" />
      <circle cx="12" cy="12" r="2.5" fill="#4877f5" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg
      height="25"
      width="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4877f5"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="12" rx="8" ry="5" />
      <circle cx="12" cy="12" r="2.5" fill="#4877f5" />
      <line x1="4" y1="20" x2="20" y2="4" stroke="#bcbcbc" strokeWidth="2" />
    </svg>
  );

  return (
    <div className={styles.pageGifBg}>
      <div className={styles.centeredContent}>
        <div className={styles.loginCard}>
          <h2 className={styles.loginTitle}>Login</h2>

          <form className={styles.loginForm} onSubmit={handleSubmit}>
            {/* Email */}
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.inputLabel}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="username@gmail.com"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.inputLabel}>
                Password
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span
                className={styles.toggleEye}
                role="button"
                tabIndex={0}
                onClick={() => setShowPassword(!showPassword)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </span>
            </div>

            {/* Options */}
            <div className={styles.optionsRow}>
              <label className={styles.rememberMe}>
                <input type="checkbox" className={styles.rememberCheckbox} />{" "}
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className={styles.forgotPasswordLink}
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            {/* Message */}
            {message && (
              <p
                className={`${styles.message} ${
                  message.toLowerCase().includes("success")
                    ? styles.success
                    : styles.error
                }`}
              >
                {message}
              </p>
            )}

            {/* Divider */}
            <div className={styles.divider}>
              <span className={styles.dividerLine}></span>
              <span>or</span>
              <span className={styles.dividerLine}></span>
            </div>

            {/* Google Login */}
            <a
              href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`}
              className={`${styles.button} ${styles.googleButton}`}
            >
              <svg
                className={styles.googleIcon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                focusable="false"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <path
                    d="M21.35 11.1h-9.17v2.82h5.63c-.24 1.41-1.28 2.61-2.75 3.12l.02.13 3.28 2.54.23.02c2.08-1.92 3.28-4.76 3.28-8.01 0-.56-.06-1.09-.15-1.62z"
                    fill="#4285F4"
                  ></path>
                  <path
                    d="M12.18 22c2.97 0 5.47-.99 7.3-2.69l-3.48-2.69c-.97.65-2.21 1.03-3.81 1.03-2.92 0-5.39-1.97-6.27-4.6l-.13.01-3.4 2.65-.04.12C4.61 19.98 8.11 22 12.18 22z"
                    fill="#34A853"
                  ></path>
                  <path
                    d="M5.91 13.05c-.22-.66-.34-1.37-.34-2.05s.12-1.39.33-2.05l-.01-.13-3.44-2.69-.11.05C1.39 7.89 1 9.4 1 11c0 1.63.39 3.18 1.11 4.56l3.81-2.51z"
                    fill="#FBBC05"
                  ></path>
                  <path
                    d="M12.18 6.89c2.14 0 3.58.92 4.41 1.7l3.23-3.15C18.55 3.84 15.89 2.5 12.18 2.5c-4.07 0-7.57 2.02-9.32 5.04l3.82 2.51c.75-2.28 2.88-4.16 5.5-4.16z"
                    fill="#EA4335"
                  ></path>
                </g>
              </svg>
              <span>Continue with Google</span>
            </a>

            {/* Sign Up */}
            <p className={styles.signupLink}>
              If you don’t have an account, please&nbsp;
              <Link href="/register" className={styles.signupLinkText}>
                Sign Up
              </Link>
              .
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
