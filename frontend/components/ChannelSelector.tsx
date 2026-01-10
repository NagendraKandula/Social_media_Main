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

const ChannelIcon = {
  twitter: <FaTwitter />,
  facebook: <FaFacebook />,
  instagram: <FaInstagram />,
  linkedin: <FaLinkedin />,
  youtube: <FaYoutube />,
  threads: <SiThreads />,
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

  const channels = Object.keys(connectedAccounts) as Channel[];

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Channels</h3>

      {channels.length === 0 && (
        <p className={styles.emptyState}>
          No channels connected
        </p>
      )}

      <div className={styles.list}>
        {channels.map((channel) => {
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
              aria-label={`Toggle ${account.name}`}
            >
              {/* Selection indicator */}
              <span
                className={`${styles.checkIndicator} ${
                  isSelected ? styles.checkActive : ""
                }`}
              />

              {/* Avatar */}
              <div className={styles.avatarWrap}>
                <img
                  src={account.profilePic || "/profile.png"}
                  alt={account.name}
                />
                <span
                  className={`${styles.platformBadge} ${
                    styles[channel]
                  }`}
                >
                  {ChannelIcon[channel]}
                </span>
              </div>

              {/* Name */}
              <span className={styles.name}>
                {account.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
