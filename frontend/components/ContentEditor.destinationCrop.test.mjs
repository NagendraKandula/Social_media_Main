import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editorSource = readFileSync(new URL("./ContentEditor.tsx", import.meta.url), "utf8");
const cropFeatureSource = readFileSync(new URL("./Cropfeature.tsx", import.meta.url), "utf8");
const publishSource = readFileSync(
  new URL("../pages/Landing/Tabs/Publish.tsx", import.meta.url),
  "utf8"
);
const editorStyles = readFileSync(
  new URL("../styles/ContentEditor.module.css", import.meta.url),
  "utf8"
);

test("crop modal renders selectable destination cards", () => {
  assert.match(cropFeatureSource, /cropDestinationGrid/);
  assert.match(cropFeatureSource, /cropDestinations\.map/);
  assert.match(cropFeatureSource, /aria-pressed=\{isActive\}/);
});

test("the selected destination is edited directly inside its post preview", () => {
  assert.match(cropFeatureSource, /cropDestinationPostHeader/);
  assert.match(cropFeatureSource, /isActive\s*&&\s*\(/);
  assert.doesNotMatch(cropFeatureSource, /className=\{styles\.cropStage\}/);
});

test("post editor replaces social actions with reset undo and redo controls", () => {
  assert.doesNotMatch(cropFeatureSource, /cropDestinationActions/);
  assert.doesNotMatch(cropFeatureSource, /cropDestinationStatus/);
  assert.match(cropFeatureSource, /aria-label="Reset selected crop"/);
  assert.match(cropFeatureSource, /aria-label="Undo selected image edit"/);
  assert.match(cropFeatureSource, /aria-label="Redo selected image edit"/);
  assert.match(cropFeatureSource, /aria-label="Confirm selected crop"/);
});

test("confirming a crop switches that post from crop controls to cropped output", () => {
  assert.match(cropFeatureSource, /confirmedCropDestinations/);
  assert.match(cropFeatureSource, /confirmActiveCrop/);
  assert.match(cropFeatureSource, /isEditing/);
});

test("reopening the crop editor hydrates saved destination crops", () => {
  assert.match(cropFeatureSource, /getSavedMediaEdit/);
  assert.match(cropFeatureSource, /savedEditToCropBox/);
  assert.match(publishSource, /getSavedMediaEdit=\{getSavedMediaEdit\}/);
});

test("image adjustments are stored by destination", () => {
  assert.match(cropFeatureSource, /destinationImageEffects/);
  assert.match(cropFeatureSource, /getDestinationKey\(activeCropDestination\)/);
});

test("crop ratio controls are shown and stored for the active destination", () => {
  assert.match(cropFeatureSource, /destinationCropRatios/);
  assert.match(cropFeatureSource, /CROP_RATIOS\.map/);
  assert.doesNotMatch(cropFeatureSource, /cropDestinations\.length === 0 && <div className=\{styles\.cropRecommendations\}/);
});

test("crop geometry is anchored to and clipped by the post image frame", () => {
  assert.match(
    editorStyles,
    /\.cropDestinationMedia\s*\{[^}]*position:\s*relative;[^}]*overflow:\s*hidden;/s
  );
});

test("destination cards keep controls directly below images without row stretching", () => {
  assert.match(editorStyles, /\.cropDestinationGrid\s*\{[^}]*align-items:\s*start;/s);
  assert.match(editorStyles, /\.cropDestinationCard\s*\{[^}]*align-content:\s*start;/s);
});

test("crop callback identifies the exact platform placement being edited", () => {
  assert.match(cropFeatureSource, /destination:\s*ImageEditDestination/);
  assert.match(publishSource, /destination\.platform/);
  assert.match(publishSource, /destination\.placement/);
});

test("Publish supplies all selected channels to the destination editor", () => {
  assert.match(publishSource, /selectedChannels=\{selectedChannelList\}/);
  assert.match(publishSource, /getImageEditDestinations\(selectedChannelList, platformState\)/);
});

test("ContentEditor delegates the complete crop workflow to Cropfeature", () => {
  assert.match(editorSource, /import Cropfeature/);
  assert.match(editorSource, /<Cropfeature/);
  assert.match(editorSource, /cropFeatureRef\.current\?\.open/);
  assert.doesNotMatch(editorSource, /const applyCrop/);
  assert.doesNotMatch(editorSource, /className=\{styles\.cropOverlay\}/);

  assert.match(cropFeatureSource, /const applyCrop/);
  assert.match(cropFeatureSource, /className=\{styles\.cropOverlay\}/);
  assert.match(cropFeatureSource, /CROP_RATIOS\.map/);
  assert.match(cropFeatureSource, /cropDestinations\.map/);
});
