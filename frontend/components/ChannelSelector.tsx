// ChannelSelector.tsx
import React from 'react';
import {
  FaTwitter,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaPinterest,
  FaYoutube,
} from 'react-icons/fa';
import { SiThreads } from 'react-icons/si';
import styles from '../styles/ChannelSelector.module.css';

export type Channel =
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'pinterest'
  | 'youtube'
  | 'threads';

const channels: Channel[] = ['twitter', 'facebook', 'instagram', 'linkedin', 'pinterest', 'youtube', 'threads'];

const ChannelIcon: Record<Channel, JSX.Element> = {
  twitter: <FaTwitter size={18} />,
  facebook: <FaFacebook size={22} />,
  instagram: <FaInstagram size={23} />,
  linkedin: <FaLinkedin size={22} />,
  pinterest: <FaPinterest size={22} />,
  youtube: <FaYoutube size={22} />,
  threads: <SiThreads size={19} />,
};

const ChannelStyle: Record<Channel, string> = {
  twitter: styles.twitter,
  facebook: styles.facebook,
  instagram: styles.instagram,
  linkedin: styles.linkedin,
  pinterest: styles.pinterest,
  youtube: styles.youtube,
  threads: styles.threads,
};

// ✅ Add props to make it controlled
interface ChannelSelectorProps {
  selectedChannels: Set<Channel>;
  onSelectionChange: (selected: Set<Channel>) => void;
}

export default function ChannelSelector({
  selectedChannels,
  onSelectionChange,
}: ChannelSelectorProps) {
  // ✅ Remove internal useState — now fully controlled

  const toggleChannel = (channel: Channel) => {
    const newSelected = new Set(selectedChannels);
    if (newSelected.has(channel)) {
      newSelected.delete(channel);
    } else {
      newSelected.add(channel);
    }
    onSelectionChange(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedChannels.size === channels.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(channels));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.horizontalWrapper}>
        <h2 className={styles.title}>Select Channels</h2>

        <div className={styles.iconWrapper}>
          {channels.map((channel) => (
            <button
              key={channel}
              className={`${styles.iconButton} ${ChannelStyle[channel]} ${
                selectedChannels.has(channel) ? styles.selected : ''
              }`}
              onClick={() => toggleChannel(channel)}
              aria-pressed={selectedChannels.has(channel)}
            >
              {ChannelIcon[channel]}
            </button>
          ))}
        </div>

        <button className={styles.selectAllButton} onClick={toggleSelectAll}>
          {selectedChannels.size === channels.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
    </div>
  );
}