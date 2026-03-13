import React from 'react';
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaAt,
  FaTwitter,
  FaLinkedin,
} from 'react-icons/fa';
import styles from '../styles/ChannelSelector.module.css';

export type Channel =
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'threads'
  | 'twitter'
  | 'linkedin';

interface Account {
  name: string;
  profilePic?: string;
  needsReconnect?: boolean;
}

interface Props {
  accounts: Partial<Record<Channel, Account>>;
  selectedChannels: Set<Channel>;
  onSelectionChange: (s: Set<Channel>) => void;
  disabledChannels?: Set<Channel>; // <-- ADDED: Track which channels are disabled by rules
}

const icons: Record<Channel, JSX.Element> = {
  facebook: <FaFacebookF />,
  instagram: <FaInstagram />,
  youtube: <FaYoutube />,
  threads: <FaAt />,
  twitter: <FaTwitter />,
  linkedin: <FaLinkedin />,
};

export default function ChannelSelector({
  accounts,
  selectedChannels,
  onSelectionChange,
  disabledChannels = new Set(), // <-- Default to empty set
}: Props) {
  const toggle = (channel: Channel) => {
    const next = new Set(selectedChannels);
    next.has(channel) ? next.delete(channel) : next.add(channel);
    onSelectionChange(next);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Select Channels</h3>

      <div className={styles.avatarRow}>
        {(Object.keys(icons) as Channel[]).map((channel) => {
          const account = accounts[channel];
          if (!account) return null;

          const isSelected = selectedChannels.has(channel);
          
          // Disable if disconnected OR blocked by multi-file rules
          const disabled = account.needsReconnect || disabledChannels.has(channel);

          return (
            <button
              key={channel}
              type="button"
              className={[
                styles.avatarBtn,
                isSelected && styles.selected,
                disabled && styles.disabled,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => !disabled && toggle(channel)}
              title={disabled ? `${account.name} (Unavailable for current media)` : account.name}
              aria-pressed={isSelected}
              disabled={disabled}
              style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              <img
                src={account.profilePic || '/profile.png'}
                alt={account.name}
                onError={(e) => {
                  e.currentTarget.src = '/profile.png';
                }}
              />
              <span className={styles.platformBadge}>
                {icons[channel]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}