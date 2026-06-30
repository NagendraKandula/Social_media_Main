import React, { useState, useEffect } from 'react';
import apiClient from '../../lib/axios'; // ✅ Import the centralized apiClient
import styles from '../../styles/ForgotPassword.module.css';
import Link from 'next/link';
import { useRouter } from 'next/router'; // Import useRouter

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter(); // Initialize router

  // --- Resend OTP Logic ---
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, resendTimer]);

  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await apiClient.get('/auth/profile');
      // ✅ CHANGED: Use apiClient
      await apiClient.post('/auth/resend-otp', { email });
      setMessage('A new OTP has been sent.');
      setCanResend(false);
      setResendTimer(60); // Reset timer
    } catch (err: any) {
      if (err.response?.status === 401) {
         window.location.href = '/Auth/login';
         return;
      }
      setError('Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };
  // --- End of Resend Logic ---

  // State for password validation
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false, hasUpper: false, hasLower: false, hasNumber: false, hasSpecial: false,
  });
  const [passwordStrengthText, setPasswordStrengthText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (newPassword.length > 0) {
      validatePassword(newPassword);
    }
  }, [newPassword]);

  const validatePassword = (value: string) => {
    const minLength = value.length >= 8;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    setPasswordValidation({ minLength, hasUpper, hasLower, hasNumber, hasSpecial });
    const score = [minLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

    if (score <= 2) setPasswordStrengthText("Weak");
    else if (score <= 4) setPasswordStrengthText("Medium");
    else setPasswordStrengthText("Strong");
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      // ✅ CHANGED: Use apiClient
      const response = await apiClient.post('/auth/forgot-password', { email });
      setMessage(response.data.message);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (Object.values(passwordValidation).some(v => !v)) {
      setError("Please ensure your password meets all the requirements.");
      return;
    }

    setLoading(true);
    try {
      // ✅ CHANGED: Use apiClient
      const response = await apiClient.post('/auth/reset-password', {
        email, otp, newPassword, confirmPassword,
      });
      setMessage(response.data.message);
      setTimeout(() => {
        router.push('/Auth/login'); // Use router for navigation
      }, 2000);
    } catch (err: any) {
      const serverError = err.response?.data?.message;
      setError(serverError ? (Array.isArray(serverError) ? serverError.join(', ') : serverError) : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = () => (
    <svg height="22" width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="12" rx="8" ry="5" /><circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );

  const EyeOffIcon = () => (
      <svg height="22" width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="12" rx="8" ry="5" /><circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" />
      </svg>
  );

  return (
    <div className={styles.pageGifBg}>
      <header className={styles.authHeader}>
        <div className={styles.logo}>
          Story<span>.</span>
        </div>
      </header>

      <main className={styles.authMain}>
        <section className={styles.formSection}>
          <div className={styles.titleRow}>
            <Link href="/Auth/login" className={styles.backHome}>
              ←
            </Link>

            <div>
              <h1 className={styles.loginTitle}>
                {step === 1 ? 'Forgot password' : 'Reset password'}
              </h1>
              <p className={styles.instructions}>
                {step === 1
                  ? "Enter your email and we'll send you a secure OTP to reset your password."
                  : `We sent an OTP to ${email}. Add it below and choose a new password.`}
              </p>
            </div>
          </div>

          <div className={styles.loginCard}>
          {step === 1 ? (
            <>
              <form className={styles.loginForm} onSubmit={handleSendOtp}>
                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.inputLabel}>Email</label>
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
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <form className={styles.loginForm} onSubmit={handleResetPassword}>
                <div className={styles.formGroup}>
                  <label htmlFor="otp" className={styles.inputLabel}>OTP</label>
                  <input
                    id="otp"
                    type="text"
                    placeholder="Enter the 6-digit OTP"
                    className={styles.input}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.resendContainer}>
                    {canResend ? (
                        <button type="button" onClick={handleResendOtp} className={styles.resendButton} disabled={loading}>
                            Resend OTP
                        </button>
                    ) : (
                        <span>Resend OTP in {resendTimer}s</span>
                    )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="newPassword" className={styles.inputLabel}>New Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className={styles.input}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button type="button" className={styles.toggleEye} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeIcon/> : <EyeOffIcon/>}
                    </button>
                  </div>
                </div>

                {newPassword.length > 0 && (
                    <div className={styles.passwordStrengthContainer}>
                        <div className={styles.strengthBarWrapper}>
                            <div className={styles.strengthBar}><div className={`${styles.strengthIndicator} ${styles[`strength-${passwordStrengthText.toLowerCase()}`]}`}></div></div>
                            <span className={`${styles.strengthText} ${styles[`strengthText-${passwordStrengthText.toLowerCase()}`]}`}>{passwordStrengthText}</span>
                        </div>
                        <ul className={styles.validationList}>
                            <li className={passwordValidation.minLength ? styles.valid : ''}>At least 8 characters</li>
                            <li className={passwordValidation.hasUpper ? styles.valid : ''}>One uppercase letter</li>
                            <li className={passwordValidation.hasLower ? styles.valid : ''}>One lowercase letter</li>
                            <li className={passwordValidation.hasNumber ? styles.valid : ''}>One number</li>
                            <li className={passwordValidation.hasSpecial ? styles.valid : ''}>One special character</li>
                        </ul>
                    </div>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword" className={styles.inputLabel}>Confirm New Password</label>
                   <div className={styles.passwordWrapper}>
                        <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        className={styles.input}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        />
                        <button type="button" className={styles.toggleEye} onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
                            {showConfirmPassword ? <EyeIcon/> : <EyeOffIcon/>}
                        </button>
                   </div>
                </div>
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
          {message && <p className={styles.successMessage}>{message}</p>}
          {error && <p className={styles.errorMessage}>{error}</p>}
          <div className={styles.backToLogin}>
            <Link href="/Auth/login">Back to Login</Link>
          </div>
          </div>
        </section>

        <section className={styles.illustrationSection}>
          <img src="/forgot-password-illustration.png" alt="Password recovery illustration" />
        </section>
      </main>

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
  );
}
