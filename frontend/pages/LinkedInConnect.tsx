import React from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/LinkedInConnect.module.css'; 
import { withAuth } from '../utils/withAuth';
import { GetServerSideProps } from 'next';

const LinkedInConnect: React.FC = () => {
    const router = useRouter();

    const handleConnect = () => {
        // ✅ CORRECTED: Points to '/auth/linkedin' instead of '/linkedin/authorize'
        // This ensures it hits the SocialAuthController consistent with Twitter/Threads
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        window.location.href = `${apiUrl}/auth/linkedin`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.headerSection}>
                    <img 
                        src="/linkedin.png" 
                        alt="LinkedIn" 
                        className={styles.mainIcon} 
                    />
                    <h1 className={styles.title}>Connect Your LinkedIn Account</h1>
                    <p className={styles.subtitle}>
                        Manage your Personal Profile, schedule posts, and track engagement — all from one powerful dashboard.
                    </p>
                </div>

                <div className={styles.featuresList}>
                    <div className={styles.featureItem}>
                        <span className={styles.featureIcon}>📘</span>
                        <div className={styles.featureText}>
                            <h3>Schedule Posts to Profile</h3>
                            <p>Plan content weeks ahead and auto-publish at optimal times.</p>
                        </div>
                    </div>

                    <div className={styles.featureItem}>
                        <span className={styles.featureIcon}>📊</span>
                        <div className={styles.featureText}>
                            <h3>Track Likes, Shares & Comments</h3>
                            <p>Understand what content resonates with your professional network.</p>
                        </div>
                    </div>

                    <div className={styles.featureItem}>
                        <span className={styles.featureIcon}>🤖</span>
                        <div className={styles.featureText}>
                            <h3>AI Caption & Hashtag Suggestions</h3>
                            <p>Save time and boost reach with smart, tailored content ideas.</p>
                        </div>
                    </div>
                </div>

                <div className={styles.securityNote}>
                    <span className={styles.lockIcon}>🔒</span> 
                    Secure connection via LinkedIn’s official OAuth 2.0 API
                </div>
                
                <div className={styles.approvalNote}>
                    🚫 We never post without your explicit approval
                </div>

                <button 
                    className={styles.connectButton} 
                    onClick={handleConnect}
                >
                    Connect to LinkedIn
                </button>

                <p className={styles.termsText}>
                    By connecting, you agree to our <span>Terms</span> and <span>Privacy Policy</span>.
                </p>
            </div>
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
    return {
        props: {},
    };
});

export default LinkedInConnect;