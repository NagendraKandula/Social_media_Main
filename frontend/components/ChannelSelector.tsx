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

interface FacebookPage {
  id: string;
  name: string;
  pictureUrl?: string | null;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

interface Props {
  accounts: Partial<Record<Channel, Account>>;
  selectedChannels: Set<Channel>;
  onSelectionChange: (s: Set<Channel>) => void;
  disabledChannels?: Set<Channel>; // <-- ADDED: Track which channels are disabled by rules
  facebookPages?: FacebookPage[];
  selectedFacebookPageId?: string;
  onFacebookPageSelect?: (pageId: string) => void;
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
  facebookPages = [],
  selectedFacebookPageId,
  onFacebookPageSelect,
}: Props) {
  const toggle = (channel: Channel) => {
    const next = new Set(selectedChannels);
    next.has(channel) ? next.delete(channel) : next.add(channel);
    onSelectionChange(next);
  };

  const selectFacebookPage = (pageId: string) => {
    const next = new Set(selectedChannels);
    const isSameSelectedPage =
      next.has('facebook') &&
      (selectedFacebookPageId ? selectedFacebookPageId === pageId : facebookPages[0]?.id === pageId);

    if (isSameSelectedPage) {
      next.delete('facebook');
      onSelectionChange(next);
      return;
    }

    next.add('facebook');
    onSelectionChange(next);
    onFacebookPageSelect?.(pageId);
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

          if (channel === 'facebook' && facebookPages.length > 0) {
            return (
              <React.Fragment key={channel}>
                {facebookPages.map((page) => {
                  const pageImage =
                    page.pictureUrl || page.picture?.data?.url || account.profilePic || '/profile.png';
                  const isPageSelected =
                    isSelected &&
                    (selectedFacebookPageId ? selectedFacebookPageId === page.id : facebookPages[0]?.id === page.id);

                  return (
                    <button
                      key={page.id}
                      type="button"
                      className={[
                        styles.avatarBtn,
                        isPageSelected && styles.selected,
                        disabled && styles.disabled,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => !disabled && selectFacebookPage(page.id)}
                      title={disabled ? `${page.name} (Unavailable for current media)` : `Facebook: ${page.name}`}
                      aria-pressed={isPageSelected}
                      disabled={disabled}
                      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                    >
                      <img
                        src={pageImage}
                        alt={page.name}
                        onError={(e) => {
                          e.currentTarget.src = '/profile.png';
                        }}
                      />
                      <span className={styles.platformBadge}>
                        {icons.facebook}
                      </span>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          }

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
