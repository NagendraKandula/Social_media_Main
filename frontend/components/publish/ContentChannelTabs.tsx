import type { Channel } from '../ChannelSelector';
import { CHANNEL_LABELS } from '../../features/publish/constants';
import styles from '../../styles/ContentChannelTabs.module.css';

interface ContentChannelTabsProps {
  selectedChannels: Channel[];
  activeChannel: Channel | null;
  onSelect: (channel: Channel | null) => void;
}

export default function ContentChannelTabs({
  selectedChannels,
  activeChannel,
  onSelect,
}: ContentChannelTabsProps) {
  if (selectedChannels.length === 0) return null;

  return (
    <div className={styles.tabs} role="tablist" aria-label="Content editor channel">
      <button
        type="button"
        role="tab"
        aria-selected={activeChannel === null}
        aria-pressed={activeChannel === null}
        className={activeChannel === null ? styles.activeTab : ''}
        onClick={() => onSelect(null)}
      >All</button>
      {selectedChannels.map((channel) => (
        <button
          key={channel}
          type="button"
          role="tab"
          aria-selected={activeChannel === channel}
          aria-pressed={activeChannel === channel}
          className={activeChannel === channel ? styles.activeTab : ''}
          onClick={() => onSelect(channel)}
        >
          {CHANNEL_LABELS[channel] || channel}
        </button>
      ))}
    </div>
  );
}
