import React from 'react';
import {
  FaTwitter,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
} from 'react-icons/fa';
import { SiThreads } from 'react-icons/si';
import styles from '../styles/ChannelSelector.module.css';

export type Channel =
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'youtube'
  | 'threads';

const channels: { id: Channel; icon: JSX.Element; label: string }[] = [
  { id: 'facebook', icon: <FaFacebook size={20} />, label: 'Facebook' },
  { id: 'instagram', icon: <FaInstagram size={20} />, label: 'Instagram' },
  { id: 'twitter', icon: <FaTwitter size={20} />, label: 'Twitter' },
  { id: 'linkedin', icon: <FaLinkedin size={20} />, label: 'LinkedIn' },
  { id: 'youtube', icon: <FaYoutube size={20} />, label: 'YouTube' },
  { id: 'threads', icon: <SiThreads size={20} />, label: 'Threads' },
];

interface ChannelSelectorProps {
  selectedChannels: Set<Channel>;
  onSelectionChange: (selected: Set<Channel>) => void;
}

export default function ChannelSelector({
  selectedChannels,
  onSelectionChange,
}: ChannelSelectorProps) {
  const toggleChannel = (channel: Channel) => {
    const newSelected = new Set(selectedChannels);
    if (newSelected.has(channel)) {
      newSelected.delete(channel);
    } else {
      newSelected.add(channel);
    }
    // ✅ Sort channels to maintain consistent preview order
    const sortedSelection = new Set(
      channels
        .map((c) => c.id)
        .filter((id) => newSelected.has(id))
    );
    onSelectionChange(sortedSelection);
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>Select Channels</span>
      <div className={styles.iconRow}>
        {channels.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`${styles.iconButton} ${
              selectedChannels.has(id) ? styles.selected : ''
            }`}
            onClick={() => toggleChannel(id)}
            aria-pressed={selectedChannels.has(id)}
            aria-label={`Toggle ${label} selection`}
            title={label}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
