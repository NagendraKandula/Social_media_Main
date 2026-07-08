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
import styles from '../styles/ChannelSelector.module.css';
import { PlatformRecommendation } from '../types'; // ADDED: Import the AI type

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
  aiRecommendations?: PlatformRecommendation[]; // ADDED: Receive AI Data
}

const icons: Record<Channel, JSX.Element> = {
  facebook: <FaFacebookF />,
  instagram: <FaInstagram />,
  youtube: <FaYoutube />,
  threads: <FaAt />,
  twitter: <FaTwitter />,
  linkedin: <FaLinkedin />,
};

// ADDED: Helper to render stars
const renderStars = (rating: number) => {
  return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
};

export default function ChannelSelector({
  accounts,
  selectedChannels,
  onSelectionChange,
  disabledChannels = new Set(),
  facebookPages = [],
  selectedFacebookPageId,
  onFacebookPageSelect,
  aiRecommendations = [], // Default to empty array
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
          const disabled = account.needsReconnect || disabledChannels.has(channel);
          
          // ADDED: Find if AI has a recommendation for this channel
          const aiRec = aiRecommendations.find(
            (r) => r.platform.toLowerCase() === channel.toLowerCase()
          );

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
                      className={[
                        styles.avatarBtn,
                        isPageSelected && styles.selected,
                        disabled && styles.disabled,
                      ].filter(Boolean).join(' ')}
                      onClick={() => !disabled && selectFacebookPage(page.id)}
                      disabled={disabled}
                      style={{ 
                        opacity: disabled ? 0.5 : 1, 
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' // Added for stack layout
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img src={pageImage} alt={page.name} onError={(e) => { e.currentTarget.src = '/profile.png'; }} />
                        <span className={styles.platformBadge}>{icons.facebook}</span>
                      </div>
                      
                      {/* ADDED: Render AI Stars */}
                      {aiRec && (
                        <div style={{ fontSize: '10px', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          {renderStars(aiRec.rating)}
                        </div>
                      )}
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
              ].filter(Boolean).join(' ')}
              onClick={() => !disabled && toggle(channel)}
              disabled={disabled}
              style={{ 
                opacity: disabled ? 0.5 : 1, 
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' // Added for stack layout
              }}
            >
              <div style={{ position: 'relative' }}>
                <img src={account.profilePic || '/profile.png'} alt={account.name} onError={(e) => { e.currentTarget.src = '/profile.png'; }} />
                <span className={styles.platformBadge}>{icons[channel]}</span>
              </div>
              
              {/* ADDED: Render AI Stars */}
              {aiRec && (
                <div style={{ fontSize: '10px', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  {renderStars(aiRec.rating)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}