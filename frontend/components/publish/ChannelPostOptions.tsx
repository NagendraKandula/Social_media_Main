import type { Dispatch, SetStateAction } from 'react';
import type { Channel } from '../ChannelSelector';
import type { PlatformState } from '../PlatformFields';
import styles from '../../styles/ChannelPostOptions.module.css';

interface ChannelPostOptionsProps {
  channel: Channel;
  platformState: PlatformState;
  setPlatformState: Dispatch<SetStateAction<PlatformState>>;
}

type Option = { value: string; label: string };

export default function ChannelPostOptions({
  channel,
  platformState,
  setPlatformState,
}: ChannelPostOptionsProps) {
  let options: Option[] = [];
  let selectedValue = '';
  let stateKey: keyof PlatformState | null = null;

  if (channel === 'facebook') {
    stateKey = 'facebookPostType';
    selectedValue = platformState.facebookPostType || 'feed';
    options = [
      { value: 'feed', label: 'Feed' },
      { value: 'reel', label: 'Reel' },
      { value: 'story', label: 'Story' },
    ];
  } else if (channel === 'instagram') {
    stateKey = 'instagramPostType';
    selectedValue = platformState.instagramPostType || 'post';
    options = [
      { value: 'post', label: 'Post' },
      { value: 'reel', label: 'Reel' },
      { value: 'story', label: 'Story' },
    ];
  } else if (channel === 'youtube') {
    stateKey = 'youtubeType';
    selectedValue = platformState.youtubeType || 'video';
    options = [
      { value: 'video', label: 'Video' },
      { value: 'shorts', label: 'Shorts' },
    ];
  }

  if (!stateKey || options.length === 0) return null;

  const updatePostType = (value: string) => {
    setPlatformState((previous) => ({ ...previous, [stateKey as string]: value }));
  };

  return (
    <fieldset className={styles.options} aria-label={`${channel} post type`}>
      {options.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            type="radio"
            name={`post-type-${channel}`}
            value={option.value}
            checked={selectedValue === option.value}
            onChange={() => updatePostType(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
