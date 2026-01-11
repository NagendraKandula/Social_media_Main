import React from "react";
import {
  FaTwitter,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
} from "react-icons/fa";
import { SiThreads } from "react-icons/si";
import styles from "../styles/ChannelSelector.module.css";

export type Channel =
  | "twitter"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "youtube"
  | "threads";

const ChannelIcon: Record<Channel, JSX.Element> = {
  twitter: <FaTwitter />,
  facebook: <FaFacebook />,
  instagram: <FaInstagram />,
  linkedin: <FaLinkedin />,
  youtube: <FaYoutube />,
  threads: <SiThreads />,
};

const ALL_CHANNELS: Channel[] = [
  "twitter",
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
  "threads",
];

const CONNECT_URLS: Record<Channel, string> = {
  twitter: "/auth/twitter",
  facebook: "/auth/facebook",
  instagram: "/auth/instagram",
  linkedin: "/auth/linkedin",
  youtube: "/auth/youtube",
  threads: "/auth/threads",
};

export interface SocialAccount {
  name: string;
  profilePic?: string;
}

interface ChannelSelectorProps {
  selectedChannels: Set<Channel>;
  onSelectionChange: (channels: Set<Channel>) => void;
  connectedAccounts: Partial<Record<Channel, SocialAccount>>;
}

export default function ChannelSelector({
  selectedChannels,
  onSelectionChange,
  connectedAccounts,
}: ChannelSelectorProps) {
  const toggleChannel = (channel: Channel) => {
    const next = new Set(selectedChannels);
    next.has(channel) ? next.delete(channel) : next.add(channel);
    onSelectionChange(next);
  };

  const connectedChannels = Object.keys(
    connectedAccounts
  ) as Channel[];

  const notConnectedChannels = ALL_CHANNELS.filter(
    (channel) => !connectedAccounts[channel]
  );

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Channels</h3>

      {/* Connected Channels */}
      {connectedChannels.length === 0 && (
        <p className={styles.emptyState}>
          No channels connected
        </p>
      )}

      <div className={styles.list}>
        {connectedChannels.map((channel) => {
          const account = connectedAccounts[channel];
          if (!account) return null;

          const isSelected = selectedChannels.has(channel);

          return (
            <button
              key={channel}
              type="button"
              className={`${styles.item} ${
                isSelected ? styles.selected : ""
              }`}
              onClick={() => toggleChannel(channel)}
              aria-pressed={isSelected}
            >
              <span
                className={`${styles.checkIndicator} ${
                  isSelected ? styles.checkActive : ""
                }`}
              />

              <div className={styles.avatarWrap}>
                <img
                  src={account.profilePic || "/profile.png"}
                  alt={account.name}
                />
                <span
                  className={`${styles.platformBadge} ${styles[channel]}`}
                >
                  {ChannelIcon[channel]}
                </span>
              </div>

              <span className={styles.name}>
                {account.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Not Connected Channels */}
      {notConnectedChannels.length > 0 && (
        <>
          <h4 className={styles.subTitle}>
            Not Connected
          </h4>

          <div className={styles.list}>
            {notConnectedChannels.map((channel) => (
              <button
                key={channel}
                type="button"
                className={`${styles.item} ${styles.notConnected}`}
                onClick={() =>
                  (window.location.href =
                    CONNECT_URLS[channel])
                }
              >
                <div className={styles.avatarWrap}>
                  <div className={styles.placeholderAvatar}>
                    {ChannelIcon[channel]}
                  </div>
                </div>

                <span className={styles.name}>
                  Connect{" "}
                  {channel.charAt(0).toUpperCase() +
                    channel.slice(1)}
                </span>

                <span className={styles.connectCta}>
                  Connect
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
