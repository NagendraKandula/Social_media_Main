// ChannelSelector.tsx
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

const channels: Channel[] = [
  "twitter",
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
  "threads",
];

const ChannelIcon: Record<Channel, JSX.Element> = {
  twitter: <FaTwitter size={18} />,
  facebook: <FaFacebook size={22} />,
  instagram: <FaInstagram size={23} />,
  linkedin: <FaLinkedin size={22} />,
  youtube: <FaYoutube size={22} />,
  threads: <SiThreads size={19} />,
};

const ChannelStyle: Record<Channel, string> = {
  twitter: styles.twitter,
  facebook: styles.facebook,
  instagram: styles.instagram,
  linkedin: styles.linkedin,
  youtube: styles.youtube,
  threads: styles.threads,
};

interface ChannelSelectorProps {
  selectedChannels: Set<Channel>;
  onSelectionChange: (selected: Set<Channel>) => void;
  connectedAccounts: Partial<Record<Channel, boolean>>;
}

export default function ChannelSelector({
  selectedChannels,
  onSelectionChange,
  connectedAccounts,
}: ChannelSelectorProps) {
  const toggleChannel = (channel: Channel) => {
    if (!connectedAccounts[channel]) return;

    const newSelected = new Set(selectedChannels);
    if (newSelected.has(channel)) {
      newSelected.delete(channel);
    } else {
      newSelected.add(channel);
    }
    onSelectionChange(newSelected);
  };

  const toggleSelectAll = () => {
    const connectedChannels = channels.filter(
      (channel) => connectedAccounts[channel]
    );

    if (selectedChannels.size === connectedChannels.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(connectedChannels));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.horizontalWrapper}>
        <h2 className={styles.title}>Select Channels</h2>

        <div className={styles.iconWrapper}>
          {channels.map((channel) => {
            const isConnected = !!connectedAccounts[channel];
            const isSelected = selectedChannels.has(channel);

            return (
              <button
                key={channel}
                className={`${styles.iconButton} ${
                  ChannelStyle[channel]
                } ${isSelected ? styles.selected : ""} ${
                  !isConnected ? styles.disabled : ""
                }`}
                onClick={() => toggleChannel(channel)}
                disabled={!isConnected}
                aria-pressed={isSelected}
                aria-disabled={!isConnected}
                title={
                  isConnected
                    ? `Post to ${channel}`
                    : `Connect ${channel} to enable`
                }
              >
                {ChannelIcon[channel]}
              </button>
            );
          })}
        </div>

        <button
          className={styles.selectAllButton}
          onClick={toggleSelectAll}
        >
          Select Connected
        </button>
      </div>
    </div>
  );
}
