export function reconcileChannelContents(selectedChannels, currentContents, fallbackContent = "") {
  return selectedChannels.reduce((nextContents, channel) => {
    nextContents[channel] = currentContents[channel] ?? fallbackContent;
    return nextContents;
  }, {});
}

export function getChannelContent(activeChannel, channelContents, fallbackContent = "") {
  if (!activeChannel) return fallbackContent;
  return channelContents[activeChannel] ?? fallbackContent;
}

export function getNextChannel(selectedChannels, activeChannel, direction) {
  if (selectedChannels.length === 0) return null;

  const currentIndex = Math.max(0, selectedChannels.indexOf(activeChannel));
  const nextIndex =
    (currentIndex + direction + selectedChannels.length) % selectedChannels.length;

  return selectedChannels[nextIndex];
}
