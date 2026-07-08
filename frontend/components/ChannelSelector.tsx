// frontend/components/ChannelSelector.tsx
import React from 'react';
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaAt,
  FaTwitter,
  FaLinkedin,
} from 'react-icons/fa';
import { Plus } from 'lucide-react';
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
  disabledChannels?: Set<Channel>;
  facebookPages?: FacebookPage[];
  selectedFacebookPageId?: string;
  onFacebookPageSelect?: (pageId: string) => void;
  onAddChannel?: () => void;
}

const icons: Record<Channel, JSX.Element> = {
  facebook: <FaFacebookF />,
  instagram: <FaInstagram />,
  youtube: <FaYoutube />,
  threads: <FaAt />,
  twitter: <FaTwitter />,
  linkedin: <FaLinkedin />,
};

const buttonClassName = (isSelected: boolean, disabled: boolean) => [
  styles.avatarBtn,
  isSelected && styles.selected,
  disabled && styles.disabled,
].filter(Boolean).join(' ');

const Avatar = ({
  image,
  name,
  channel,
}: {
  image: string;
  name: string;
  channel: Channel;
}) => (
  <span className={styles.avatar}>
    <img
      src={image}
      alt=""
      onError={(event) => {
        event.currentTarget.src = '/profile.png';
      }}
    />
    <span className={styles.platformBadge} aria-hidden="true">{icons[channel]}</span>
    <span className={styles.srOnly}>{name}</span>
  </span>
);

export default function ChannelSelector({
  accounts,
  selectedChannels,
  onSelectionChange,
  disabledChannels = new Set(),
  facebookPages = [],
  selectedFacebookPageId,
  onFacebookPageSelect,
  onAddChannel,
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
      <div className={styles.selectorRow}>
        <div className={styles.avatarRow} role="group" aria-label="Select channels">
          {(Object.keys(icons) as Channel[]).map((channel) => {
            const account = accounts[channel];
            if (!account) return null;

            const isSelected = selectedChannels.has(channel);
            const disabled = account.needsReconnect || disabledChannels.has(channel);

            if (channel === 'facebook' && facebookPages.length > 0) {
              return (
                <React.Fragment key={channel}>
                  {facebookPages.map((page) => {
                    const pageImage = page.pictureUrl || page.picture?.data?.url || account.profilePic || '/profile.png';
                    const isPageSelected = isSelected && (selectedFacebookPageId ? selectedFacebookPageId === page.id : facebookPages[0]?.id === page.id);

                    return (
                      <button
                        key={page.id}
                        type="button"
                        className={buttonClassName(isPageSelected, disabled)}
                        onClick={() => !disabled && selectFacebookPage(page.id)}
                        disabled={disabled}
                        title={page.name}
                        aria-pressed={isPageSelected}
                      >
                        <Avatar image={pageImage} name={page.name} channel="facebook" />
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
                className={buttonClassName(isSelected, disabled)}
                onClick={() => !disabled && toggle(channel)}
                disabled={disabled}
                title={account.name}
                aria-pressed={isSelected}
              >
                <Avatar
                  image={account.profilePic || '/profile.png'}
                  name={account.name}
                  channel={channel}
                />
              </button>
            );
          })}
          {onAddChannel && (
            <button
              type="button"
              className={styles.addChannelBtn}
              onClick={onAddChannel}
              aria-label="Add channel"
              title="Add channel"
            >
              <Plus size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
