import React, { useEffect, useState } from "react";
import apiClient from "../lib/axios";
import styles from "../styles/ActivePlatforms.module.css";
import {
  FaFacebookF,
  FaInstagram,
  FaPlus,
  FaUnlink,
  FaSyncAlt,
  FaYoutube,
  FaAt,
  FaTwitter,
  FaLinkedin,
} from "react-icons/fa";

/* =========================
   TYPE DEFINITIONS
   ========================= */

type Provider =
  | "facebook"
  | "instagram"
  | "youtube"
  | "threads"
  | "twitter"
  | "linkedin";

type Action = "connect" | "reconnect" | "disconnect";

interface SocialAccount {
  name: string;
  profilePic?: string;
}

type AccountsResponse = {
  [key in Provider]?: SocialAccount;
};

let cachedAccounts: AccountsResponse | null = null;
/* =========================
   COMPONENT
   ========================= */



const ActivePlatforms = () => {
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Provider | null>(null);

  const fetchAccounts = async (silent = false) => {
  try {
    if (!silent) setLoading(true);

    const res = await apiClient.get("/auth/social/active-accounts");

    setAccounts(res.data);
    cachedAccounts = res.data; // ✅ update cache
  } catch (err) {
    console.error("Failed to fetch active accounts:", err);
  } finally {
    if (!silent) setLoading(false);
  }
};


  useEffect(() => {
  if (cachedAccounts) {
    // ✅ Instant render from cache
    setAccounts(cachedAccounts);
    setLoading(false);

    // 🔄 Background refresh
    fetchAccounts(true);
  } else {
    // First time only
    fetchAccounts();
  }
}, []);


  const notifyHeader = () => {
    window.dispatchEvent(new Event("social-accounts-updated"));
  };

  const handleAction = async (provider: Provider, action: Action) => {
    if (action === "disconnect") {
      const confirmed = window.confirm(`Disconnect ${provider}?`);
      if (!confirmed) return;

      try {
        setActionLoading(provider);
        await apiClient.delete(`/auth/social/${provider}`);
        await fetchAccounts();
        notifyHeader(); // ✅ sync header immediately
      } catch {
        alert(`Unable to disconnect ${provider}`);
      } finally {
        setActionLoading(null);
      }
      return;
    }

    try {
      setActionLoading(provider);
      await apiClient.get("/auth/profile");

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const redirectUrl =
        action === "reconnect"
          ? `${backendUrl}/auth/${provider}?reconnect=true`
          : `${backendUrl}/auth/${provider}`;

      notifyHeader(); // ✅ sync before redirect
      window.location.href = redirectUrl;
    } catch {
      alert(`Unable to connect ${provider}`);
      setActionLoading(null);
    }
  };

  const platforms: { id: Provider; name: string; icon: JSX.Element }[] = [
    { id: "facebook", name: "Facebook", icon: <FaFacebookF /> },
    { id: "instagram", name: "Instagram", icon: <FaInstagram /> },
    { id: "youtube", name: "YouTube", icon: <FaYoutube /> },
    { id: "threads", name: "Threads", icon: <FaAt /> },
    { id: "twitter", name: "X (Twitter)", icon: <FaTwitter /> },
    { id: "linkedin", name: "LinkedIn", icon: <FaLinkedin /> },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Social Media Connections</h1>

      {loading ? (
        <p className={styles.loadingText}>Loading connected accounts…</p>
      ) : (
        <div className={styles.platformGrid}>
          {platforms.map((p) => {
            const connected = accounts?.[p.id];
            const isBusy = actionLoading === p.id;

            return (
              <div key={p.id} className={styles.card}>
                {/* HEADER */}
                <div className={styles.cardHeader}>
                  <span className={styles.platformIcon}>{p.icon}</span>
                  <h3 className={styles.platformName}>{p.name}</h3>
                </div>

                {/* BODY */}
                <div className={styles.cardBody}>
                  {connected ? (
                    <div className={styles.connectedProfile}>
                      <img
                        src={connected.profilePic || "/profile.png"}
                        alt={connected.name}
                        className={styles.avatar}
                        onError={(e) =>
                          (e.currentTarget.src = "/profile.png")
                        }
                      />
                      <div className={styles.profileInfo}>
                        <p className={styles.userName}>{connected.name}</p>
                        <span className={styles.statusBadge}>Connected</span>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.emptyText}>
                      No {p.name} account linked.
                    </p>
                  )}
                </div>

                {/* FOOTER */}
                <div className={styles.cardFooter}>
                  {connected ? (
                    <>
                      <button
                        onClick={() => handleAction(p.id, "reconnect")}
                        disabled={isBusy}
                        className={styles.reconnectBtn}
                      >
                        <FaSyncAlt />
                        {isBusy ? "Reconnecting..." : "Reconnect"}
                      </button>

                      <button
                        onClick={() => handleAction(p.id, "disconnect")}
                        disabled={isBusy}
                        className={styles.disconnectBtn}
                      >
                        <FaUnlink />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleAction(p.id, "connect")}
                      disabled={isBusy}
                      className={styles.connectBtn}
                    >
                      <FaPlus />
                      {isBusy ? "Connecting..." : "Connect"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivePlatforms;
