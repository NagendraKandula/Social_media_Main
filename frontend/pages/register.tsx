import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Register.module.css";
import apiClient from "../lib/axios";
import Chatbot from "../components/Chatbot"; // ✅ correct import

export default function SignupPage() {
  const router = useRouter();

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  });
  const [passwordStrengthText, setPasswordStrengthText] = useState("");

  useEffect(() => {
    validatePassword(password);
  }, [password]);

  const validatePassword = (value: string) => {
    const minLength = value.length >= 8;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    setPasswordValidation({
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
    });

    const score = [
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
    ].filter(Boolean).length;

    if (score <= 2) setPasswordStrengthText("Weak");
    else if (score <= 4) setPasswordStrengthText("Medium");
    else setPasswordStrengthText("Strong");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (Object.values(passwordValidation).some((v) => !v)) {
      setError("Please ensure your password meets all the requirements.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/auth/register", {
        fullName: username,
        email,
        password,
        confirmPassword: password,
      });

      setMessage(response.data.message || "Registration successful!");
      router.push("/login");
    } catch (err: any) {
      const serverError = err.response?.data?.message;
      setError(
        serverError
          ? Array.isArray(serverError)
            ? serverError.join(", ")
            : serverError
          : "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
            <h1 className={styles.title}>Create an account</h1>
            <p className={styles.subtitle}>
              Sign up to get started with your account
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {/* Full Name */}
              <div className={styles.formGroup}>
                <label>Full name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

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
                <input
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Strength */}
              {password.length > 0 && (
                <p>Password strength: {passwordStrengthText}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={passwordStrengthText !== "Strong" || loading}
              >
                {loading ? "Creating account..." : "Sign up"}
              </button>

              {/* Messages */}
              {error && <p className={styles.error}>{error}</p>}
              {message && <p className={styles.success}>{message}</p>}

              <div className={styles.divider}>OR</div>

              <a
                href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`}
                className={styles.googleBtn}
              >
                Continue with Google
              </a>

              <p className={styles.switchAuth}>
                Already have an account? <Link href="/login">Log in</Link>
              </p>
            </form>
          </section>

          {/* RIGHT */}
          <section className={styles.illustrationSection}>
            <img src="registerimg.png" alt="Register illustration" />
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
          <span>©️ 2025 Story.</span>
        </footer>
      </div>

      {/* ✅ SAME CHATBOT AS LOGIN */}
      <Chatbot type="pre-login" />
    </>
  );
}