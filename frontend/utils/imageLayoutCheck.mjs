// frontend/utils/imageLayoutCheck.mjs
//
// Pure, framework-free helpers behind the Publish page's Image Editing panel.
// Kept dependency-free (like channelContent.mjs / cropValidation.mjs) so they
// are easy to unit test and reuse from both the editor and the preview.

/**
 * Narrows the full layout catalogue down to the layouts that are relevant
 * right now, based on which channels are selected and (where a channel has
 * more than one post type, e.g. Instagram feed/reel/story) which post type
 * is active for that channel.
 */
export function getApplicableLayouts(allLayouts, selectedChannels, postTypeByChannel = {}) {
  return allLayouts.filter((layout) => {
    if (!selectedChannels.includes(layout.channel)) return false;
    if (!layout.appliesTo) return true;
    return layout.appliesTo(postTypeByChannel[layout.channel]);
  });
}

/**
 * Grades a single image's dimensions against a single layout's required
 * aspect ratio. Returns "good", "warning" (needs a crop adjustment), or
 * "unknown" (dimensions not available yet).
 */
export function getLayoutStatus(dimensions, layout) {
  if (!dimensions || !dimensions.width || !dimensions.height || !layout) {
    return "unknown";
  }

  const actualRatio = dimensions.width / dimensions.height;
  const relativeDifference = Math.abs(actualRatio - layout.ratio) / layout.ratio;

  return relativeDifference <= layout.tolerance ? "good" : "warning";
}

/**
 * Evaluates one image against every applicable layout in one pass.
 */
export function evaluateImageLayouts(dimensions, layouts) {
  return layouts.map((layout) => ({
    layout,
    status: getLayoutStatus(dimensions, layout),
  }));
}

/**
 * Small summary used for badges/counters, e.g. "2 layouts need your attention".
 */
export function summarizeLayoutStatuses(layoutEvaluations) {
  const needsAttention = layoutEvaluations.filter(
    (evaluation) => evaluation.status === "warning"
  ).length;

  return {
    total: layoutEvaluations.length,
    needsAttention,
  };
}
