import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import apiClient from "../lib/axios";
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
      await apiClient.post("/auth/login", { email, password });
      await apiClient.get("/auth/profile");
      setMessage("Login successful!");
      router.push("/Landing");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Login failed. Please try again.";
      setMessage(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      {/* HEADER */}
      <header className={styles.authHeader}>
        <div className={styles.logo}>
          Story<span>.</span>
        </div>
      </header>

      {/* MAIN */}
      <main className={styles.authMain}>
        {/* LEFT FORM */}
        <section className={styles.formSection}>
          <h1 className={styles.title}>Log in</h1>
          <p className={styles.subtitle}>
            Log in to access your account and manage your content
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className={styles.formGroup}>
              <label>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className={styles.formGroup}>
              <label>Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeToggle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className={styles.optionsRow}>
              <label className={styles.checkbox}>
                <input type="checkbox" /> Remember me
              </label>

              <Link href="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
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
            <div className={styles.divider}>OR</div>

            {/* Google */}
            <a
              href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`}
              className={styles.googleBtn}
            >
              Continue with Google
            </a>

            {/* Signup */}
            <p className={styles.switchAuth}>
              Don’t have an account?{" "}
              <Link href="/register">Sign up</Link>
            </p>
          </form>
        </section>

        {/* RIGHT ILLUSTRATION */}
        <section className={styles.illustrationSection}>
          <img
            src="loginimg.png"
            alt="Dashboard illustration"
          />
        </section>
      </main>

      {/* FOOTER */}
      <footer className={styles.authFooter}>
        <span>About</span>
        <span>Help Center</span>
        <span>Terms of Service</span>
        <span>Privacy Policy</span>
        <span>Cookie Policy</span>
        <span>Accessibility</span>
        <span>© 2025 Story.</span>
      </footer>
    </div>
  );
}
