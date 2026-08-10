import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Check, Redo2, RotateCcw, Undo2 } from "lucide-react";
import styles from "../styles/ContentEditor.module.css";
import type { ImageEditDestination, MediaEditDraft } from "../features/publish/types";
import { getStableObjectUrl } from "../utils/mediaObjectUrl";
import {
  areDimensionOnlyErrors,
  getCropOutputFormat,
} from "../utils/cropValidation.mjs";
import {
  getImageFilter,
  getImageTransform,
  sharpenPixelData,
} from "../utils/imageEditEffects.mjs";
import {
  createCropBox,
  getCropPixels,
  moveCropBox,
  resizeCropBox,
} from "../utils/cropGeometry.mjs";

export type CropSession = {
  originalFiles: any[];
  remainingIndices: number[];
};

export interface CropfeatureHandle {
  open: (index: number, session?: CropSession | null) => void;
}

interface CropfeatureProps {
  files: any[];
  onFilesChange: (files: any[]) => void;
  cropDestinations: ImageEditDestination[];
  getSavedMediaEdit?: (file: File, destination: ImageEditDestination) => MediaEditDraft | undefined;
  validateFilesForSelectedChannels?: (nextFiles: any[]) => string[] | Promise<string[]>;
  onMediaEditApply?: (
    file: File,
    edit: {
      cropX: number;
      cropY: number;
      cropWidth: number;
      cropHeight: number;
      rotation: number;
    },
    renderedPreview: File,
    destination: ImageEditDestination
  ) => void;
}

type CropBox = { x: number; y: number; width: number; height: number };
type CropRatio = {
  label: string;
  sizeLabel: string;
  value: number | null;
  outputWidth: number | null;
  outputHeight: number | null;
};
type CropHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
type CropInteraction = {
  mode: "move" | "resize";
  handle?: CropHandle;
  startClientX: number;
  startClientY: number;
  startBox: CropBox;
};

const createDefaultImageEffects = () => ({
  rotation: 0,
  mirror: false,
  flip: false,
  blur: false,
  sharpen: false,
  enhance: false,
  grayscale: false,
  invert: false,
});
type ImageEffects = ReturnType<typeof createDefaultImageEffects>;
type EditSnapshot = { cropBox: CropBox; effects: ImageEffects; ratio: CropRatio };
type EditHistory = { past: EditSnapshot[]; future: EditSnapshot[] };

// ----------------------------------------------------------------------
// 🌟 NEW: Dynamic Ratios (3 per platform + placement)
// ----------------------------------------------------------------------
const PLATFORM_CROP_OPTIONS: Record<string, Record<string, CropRatio[]>> = {
  facebook: {
    FEED: [
      { label: "Portrait", sizeLabel: "4:5", value: 4 / 5, outputWidth: 1200, outputHeight: 1500 },
      { label: "Square", sizeLabel: "1:1", value: 1, outputWidth: 1200, outputHeight: 1200 },
      { label: "Landscape", sizeLabel: "1.91:1", value: 1200 / 630, outputWidth: 1200, outputHeight: 630 },
    ],
    STORY: [
      { label: "Story", sizeLabel: "9:16", value: 9 / 16, outputWidth: 1080, outputHeight: 1920 },
    ]
  },
  instagram: {
    FEED: [
      { label: "Portrait", sizeLabel: "4:5", value: 4 / 5, outputWidth: 1080, outputHeight: 1350 },
      { label: "Square", sizeLabel: "1:1", value: 1, outputWidth: 1080, outputHeight: 1080 },
      { label: "Landscape", sizeLabel: "1.91:1", value: 1080 / 566, outputWidth: 1080, outputHeight: 566 },
    ],
    STORY: [
      { label: "Story", sizeLabel: "9:16", value: 9 / 16, outputWidth: 1080, outputHeight: 1920 },
    ]
  },
  instagram_business: {
    FEED: [
      { label: "Portrait", sizeLabel: "4:5", value: 4 / 5, outputWidth: 1080, outputHeight: 1350 },
      { label: "Square", sizeLabel: "1:1", value: 1, outputWidth: 1080, outputHeight: 1080 },
      { label: "Landscape", sizeLabel: "1.91:1", value: 1080 / 566, outputWidth: 1080, outputHeight: 566 },
    ],
    STORY: [
      { label: "Story", sizeLabel: "9:16", value: 9 / 16, outputWidth: 1080, outputHeight: 1920 },
    ]
  },
  linkedin: {
    FEED: [
      { label: "Square", sizeLabel: "1:1", value: 1, outputWidth: 1200, outputHeight: 1200 },
      { label: "Portrait", sizeLabel: "4:5", value: 4 / 5, outputWidth: 1200, outputHeight: 1500 },
      { label: "Landscape", sizeLabel: "1.91:1", value: 1200 / 627, outputWidth: 1200, outputHeight: 627 },
    ]
  },
  twitter: {
    FEED: [
      { label: "Landscape", sizeLabel: "16:9", value: 16 / 9, outputWidth: 1600, outputHeight: 900 },
      { label: "Square", sizeLabel: "1:1", value: 1, outputWidth: 1200, outputHeight: 1200 },
      { label: "Portrait", sizeLabel: "4:5", value: 4 / 5, outputWidth: 1200, outputHeight: 1500 },
    ]
  },
  threads: {
    FEED: [
      { label: "Portrait", sizeLabel: "4:5", value: 4 / 5, outputWidth: 1080, outputHeight: 1350 },
      { label: "Square", sizeLabel: "1:1", value: 1, outputWidth: 1080, outputHeight: 1080 },
      { label: "Landscape", sizeLabel: "16:9", value: 16 / 9, outputWidth: 1920, outputHeight: 1080 },
    ]
  },
  pinterest: {
    FEED: [
      { label: "Standard Pin", sizeLabel: "2:3", value: 2 / 3, outputWidth: 1000, outputHeight: 1500 },
      { label: "Square", sizeLabel: "1:1", value: 1, outputWidth: 1000, outputHeight: 1000 },
      { label: "Long Pin", sizeLabel: "1:2.1", value: 1 / 2.1, outputWidth: 1000, outputHeight: 2100 },
    ]
  },
  youtube: {
    FEED: [
      { label: "Landscape", sizeLabel: "16:9", value: 16 / 9, outputWidth: 1920, outputHeight: 1080 },
      { label: "Standard", sizeLabel: "4:3", value: 4 / 3, outputWidth: 1440, outputHeight: 1080 },
      { label: "Square", sizeLabel: "1:1", value: 1, outputWidth: 1080, outputHeight: 1080 },
    ],
    SHORT: [
      { label: "Short", sizeLabel: "9:16", value: 9 / 16, outputWidth: 1080, outputHeight: 1920 },
    ]
  }
};

// ----------------------------------------------------------------------
// 🌟 NEW: Max Dimensions Helper (For Custom Fit Logic)
// ----------------------------------------------------------------------
const getMaxDimensions = (platform?: string) => {
  switch(platform) {
      case 'instagram':
      case 'instagram_business':
      case 'threads':
          return { maxWidth: 1440, maxHeight: 1800 }; 
      case 'facebook':
          return { maxWidth: 2048, maxHeight: 2048 };
      case 'linkedin':
      case 'twitter':
          return { maxWidth: 4096, maxHeight: 4096 };
      case 'pinterest':
          return { maxWidth: 1000, maxHeight: 2100 };
      case 'youtube':
          return { maxWidth: 3840, maxHeight: 2160 };
      default:
          return { maxWidth: 2048, maxHeight: 2048 };
  }
};

const savedEditToCropBox = (
  edit: MediaEditDraft,
  imageWidth: number,
  imageHeight: number
): CropBox => ({
  x: (edit.cropX / imageWidth) * 100,
  y: (edit.cropY / imageHeight) * 100,
  width: (edit.cropWidth / imageWidth) * 100,
  height: (edit.cropHeight / imageHeight) * 100,
});

const cropRatioFromSavedEdit = (edit: MediaEditDraft, platform: string, placement: string): CropRatio => {
  const value = edit.cropWidth / edit.cropHeight;
  const ratios = (PLATFORM_CROP_OPTIONS[platform] || PLATFORM_CROP_OPTIONS['instagram'])[placement] || PLATFORM_CROP_OPTIONS['instagram']['FEED'];
  return ratios.find((ratio) => ratio.value && Math.abs(ratio.value - value) < 0.002) || { label: "Custom Max Fit", sizeLabel: "Custom", value: null, outputWidth: null, outputHeight: null };
};

const getDestinationKey = (destination: ImageEditDestination) =>
  `${destination.platform}:${destination.placement}`;

const getDestinationRatio = (destination: ImageEditDestination): CropRatio => ({
  label: destination.label,
  sizeLabel: `${Math.round(destination.ratio * 1000)}:1000`,
  value: destination.ratio,
  outputWidth: 1080,
  outputHeight: Math.round(1080 / destination.ratio),
});

const Cropfeature = forwardRef<CropfeatureHandle, CropfeatureProps>(function Cropfeature(
  {
    files,
    onFilesChange,
    cropDestinations,
    getSavedMediaEdit,
    validateFilesForSelectedChannels,
    onMediaEditApply,
  },
  ref
) {
  const [cropTargetIndex, setCropTargetIndex] = useState<number | null>(null);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  // Default fallback ratio
  const [cropRatio, setCropRatio] = useState<CropRatio>({ label: "Square", sizeLabel: "1:1", value: 1, outputWidth: 1080, outputHeight: 1080 });
  const [cropBox, setCropBox] = useState({ x: 12.5, y: 0, width: 75, height: 100 });
  const [activeCropDestination, setActiveCropDestination] = useState<ImageEditDestination | null>(null);
  const [destinationCropBoxes, setDestinationCropBoxes] = useState<Record<string, CropBox>>({});
  const [destinationCropRatios, setDestinationCropRatios] = useState<Record<string, CropRatio>>({});
  const [destinationImageEffects, setDestinationImageEffects] = useState<Record<string, ImageEffects>>({});
  const [destinationEditHistory, setDestinationEditHistory] = useState<Record<string, EditHistory>>({});
  const [confirmedCropDestinations, setConfirmedCropDestinations] = useState<Record<string, boolean>>({});
  const [cropImageDimensions, setCropImageDimensions] = useState({ width: 0, height: 0 });
  const [imageEffects, setImageEffects] = useState(createDefaultImageEffects);
  const cropPreviewRef = useRef<HTMLElement | null>(null);
  const cropInteractionRef = useRef<CropInteraction | null>(null);

  const initializeCrop = (index: number) => {
    const firstDestination = cropDestinations[0] || null;
    setCropTargetIndex(index);
    setActiveCropDestination(firstDestination);
    setDestinationCropBoxes({});
    setDestinationCropRatios({});
    setDestinationImageEffects({});
    setDestinationEditHistory({});
    const file = files[index];
    setConfirmedCropDestinations(
      file instanceof File && getSavedMediaEdit
        ? Object.fromEntries(
            cropDestinations
              .filter((destination) => Boolean(getSavedMediaEdit(file, destination)))
              .map((destination) => [getDestinationKey(destination), true])
          )
        : {}
    );
    setCropRatio(firstDestination ? getDestinationRatio(firstDestination) : PLATFORM_CROP_OPTIONS.instagram.FEED[0]);
    setCropImageDimensions({ width: 0, height: 0 });
    setImageEffects(createDefaultImageEffects());
  };

  useImperativeHandle(ref, () => ({
    open: (index, session = null) => {
      setCropSession(session);
      initializeCrop(index);
    },
  }));

  const closeCrop = () => {
    setCropTargetIndex(null);
    cropInteractionRef.current = null;
  };

  const cancelCrop = () => {
    if (cropSession) onFilesChange(cropSession.originalFiles);
    setCropSession(null);
    closeCrop();
  };

  const selectCropDestination = (destination: ImageEditDestination) => {
    const key = getDestinationKey(destination);
    if (activeCropDestination && getDestinationKey(activeCropDestination) === key) {
      if (confirmedCropDestinations[key]) {
        setConfirmedCropDestinations((current) => ({ ...current, [key]: false }));
      }
      return;
    }

    if (activeCropDestination) {
      const activeKey = getDestinationKey(activeCropDestination);
      setDestinationCropBoxes((current) => ({ ...current, [activeKey]: cropBox }));
      setDestinationImageEffects((current) => ({ ...current, [activeKey]: imageEffects }));
      setDestinationCropRatios((current) => ({ ...current, [activeKey]: cropRatio }));
    }

    const sourceFile = cropTargetIndex !== null ? files[cropTargetIndex] : null;
    const savedEdit = sourceFile instanceof File ? getSavedMediaEdit?.(sourceFile, destination) : undefined;
    const nextRatio = destinationCropRatios[key] ||
      (savedEdit ? cropRatioFromSavedEdit(savedEdit, destination.platform, destination.placement) : getDestinationRatio(destination));
    const savedBox = destinationCropBoxes[key];
    setActiveCropDestination(destination);
    setCropRatio(nextRatio);
    setImageEffects(destinationImageEffects[key] || createDefaultImageEffects());
    setCropBox(
      savedBox ||
        (cropImageDimensions.width && cropImageDimensions.height
          ? createCropBox(cropImageDimensions.width, cropImageDimensions.height, destination.ratio)
          : { x: 0, y: 0, width: 100, height: 100 })
    );
  };

  const recordActiveEdit = () => {
    if (!activeCropDestination) return;
    const key = getDestinationKey(activeCropDestination);
    const snapshot = { cropBox, effects: imageEffects, ratio: cropRatio };
    setDestinationEditHistory((current) => ({
      ...current,
      [key]: { past: [...(current[key]?.past || []), snapshot], future: [] },
    }));
  };

  const applyEditSnapshot = (snapshot: EditSnapshot) => {
    if (!activeCropDestination) return;
    const key = getDestinationKey(activeCropDestination);
    setCropBox(snapshot.cropBox);
    setImageEffects(snapshot.effects);
    setCropRatio(snapshot.ratio);
    setDestinationCropBoxes((current) => ({ ...current, [key]: snapshot.cropBox }));
    setDestinationImageEffects((current) => ({ ...current, [key]: snapshot.effects }));
    setDestinationCropRatios((current) => ({ ...current, [key]: snapshot.ratio }));
  };

  const undoActiveEdit = () => {
    if (!activeCropDestination) return;
    const key = getDestinationKey(activeCropDestination);
    const history = destinationEditHistory[key];
    if (!history?.past.length) return;
    const previous = history.past[history.past.length - 1];
    setDestinationEditHistory((current) => ({
      ...current,
      [key]: {
        past: history.past.slice(0, -1),
        future: [{ cropBox, effects: imageEffects, ratio: cropRatio }, ...history.future],
      },
    }));
    applyEditSnapshot(previous);
  };

  const redoActiveEdit = () => {
    if (!activeCropDestination) return;
    const key = getDestinationKey(activeCropDestination);
    const history = destinationEditHistory[key];
    if (!history?.future.length) return;
    const next = history.future[0];
    setDestinationEditHistory((current) => ({
      ...current,
      [key]: {
        past: [...history.past, { cropBox, effects: imageEffects, ratio: cropRatio }],
        future: history.future.slice(1),
      },
    }));
    applyEditSnapshot(next);
  };

  const resetActiveEdit = () => {
    if (!activeCropDestination || !cropImageDimensions.width || !cropImageDimensions.height) return;
    recordActiveEdit();
    const key = getDestinationKey(activeCropDestination);
    const defaultRatio = getDestinationRatio(activeCropDestination);
    setConfirmedCropDestinations((current) => ({ ...current, [key]: false }));
    applyEditSnapshot({
      cropBox: createCropBox(cropImageDimensions.width, cropImageDimensions.height, activeCropDestination.ratio),
      effects: createDefaultImageEffects(),
      ratio: defaultRatio,
    });
  };

  const confirmActiveCrop = () => {
    if (!activeCropDestination) return;
    const key = getDestinationKey(activeCropDestination);
    setDestinationCropBoxes((current) => ({ ...current, [key]: cropBox }));
    setDestinationImageEffects((current) => ({ ...current, [key]: imageEffects }));
    setDestinationCropRatios((current) => ({ ...current, [key]: cropRatio }));
    setConfirmedCropDestinations((current) => ({ ...current, [key]: true }));
  };

  const toggleImageEffect = (
    effect: "mirror" | "flip" | "blur" | "sharpen" | "enhance" | "grayscale" | "invert"
  ) => {
    recordActiveEdit();
    setImageEffects((current) => {
      const next = { ...current, [effect]: !current[effect] };
      if (activeCropDestination) {
        const key = getDestinationKey(activeCropDestination);
        setDestinationImageEffects((effects) => ({ ...effects, [key]: next }));
      }
      return next;
    });
  };

  const rotateImage = () => {
    recordActiveEdit();
    setImageEffects((current) => {
      const next = { ...current, rotation: (current.rotation + 45) % 360 };
      if (activeCropDestination) {
        const key = getDestinationKey(activeCropDestination);
        setDestinationImageEffects((effects) => ({ ...effects, [key]: next }));
      }
      return next;
    });
  };

  // ----------------------------------------------------------------------
  // 🌟 NEW: Dynamic Ratio Application & Max Bounds
  // ----------------------------------------------------------------------
  const selectCropRatio = (ratio: CropRatio) => {
    recordActiveEdit();
    setCropRatio(ratio);
    if (activeCropDestination) {
      const key = getDestinationKey(activeCropDestination);
      setDestinationCropRatios((current) => ({ ...current, [key]: ratio }));
      setConfirmedCropDestinations((current) => ({ ...current, [key]: false }));
    }
    
    if (cropImageDimensions.width && cropImageDimensions.height) {
      if (ratio.value !== null) {
        // Standard Fixed Aspect Ratio
        setCropBox(createCropBox(cropImageDimensions.width, cropImageDimensions.height, ratio.value));
      } else {
        // Custom Max Fit Logic
        const platform = activeCropDestination?.platform;
        const { maxWidth, maxHeight } = getMaxDimensions(platform);

        // If the image is smaller than platform max, select the full image
        if (cropImageDimensions.width <= maxWidth && cropImageDimensions.height <= maxHeight) {
          setCropBox({ x: 0, y: 0, width: 100, height: 100 });
        } else {
          // If the image exceeds limits, constrain the box to max bounds
          const boxWidthPercent = Math.min(100, (maxWidth / cropImageDimensions.width) * 100);
          const boxHeightPercent = Math.min(100, (maxHeight / cropImageDimensions.height) * 100);

          setCropBox({
            x: (100 - boxWidthPercent) / 2, // Center the box
            y: (100 - boxHeightPercent) / 2, // Center the box
            width: boxWidthPercent,
            height: boxHeightPercent
          });
        }
      }
    }
  };

  const startCropInteraction = (
    event: React.PointerEvent,
    mode: "move" | "resize",
    handle?: CropHandle
  ) => {
    event.preventDefault();
    event.stopPropagation();
    recordActiveEdit();
    cropInteractionRef.current = {
      mode,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: cropBox,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateCropFromPointer = (event: React.PointerEvent) => {
    const interaction = cropInteractionRef.current;
    const preview = cropPreviewRef.current;
    if (!interaction || !preview) return;
    const rect = preview.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;

    if (interaction.mode === "move") {
      const deltaX = ((event.clientX - interaction.startClientX) / rect.width) * 100;
      const deltaY = ((event.clientY - interaction.startClientY) / rect.height) * 100;
      setCropBox(moveCropBox(interaction.startBox, deltaX, deltaY));
      return;
    }

    setCropBox(
      resizeCropBox(
        interaction.startBox,
        interaction.handle,
        pointerX,
        pointerY,
        cropImageDimensions.width / cropImageDimensions.height,
        cropRatio.value
      )
    );
  };

  const stopCropInteraction = (event: React.PointerEvent) => {
    cropInteractionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const applyCrop = async () => {
    if (cropTargetIndex === null) return;
    const file = files[cropTargetIndex];
    if (!file || !(file instanceof File) || !file.type.startsWith("image/")) {
      closeCrop();
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = async () => {
      const currentDestinationKey = activeCropDestination
        ? getDestinationKey(activeCropDestination)
        : null;
      const savedCropBoxes = currentDestinationKey
        ? { ...destinationCropBoxes, [currentDestinationKey]: cropBox }
        : destinationCropBoxes;
      const savedImageEffects = currentDestinationKey
        ? { ...destinationImageEffects, [currentDestinationKey]: imageEffects }
        : destinationImageEffects;
      const destinationsToRender = onMediaEditApply && cropDestinations.length > 0
        ? cropDestinations
        : activeCropDestination
          ? [activeCropDestination]
          : [];
      const renderTargets = destinationsToRender.length > 0
        ? destinationsToRender.map((destination) => {
            const key = getDestinationKey(destination);
            return {
              destination,
              ratio: destinationCropRatios[key] || getDestinationRatio(destination),
              box: savedCropBoxes[key] || createCropBox(image.naturalWidth, image.naturalHeight, destination.ratio),
              effects: savedImageEffects[key] || createDefaultImageEffects(),
            };
          })
        : [{ destination: null, ratio: cropRatio, box: cropBox, effects: imageEffects }];
      const outputFormat = getCropOutputFormat(file.type);

      const renderTarget = ({ destination, ratio, box, effects }: typeof renderTargets[number]) =>
        new Promise<{
          destination: ImageEditDestination | null;
          sourceCrop: ReturnType<typeof getCropPixels>;
          croppedFile: File;
        }>((resolve, reject) => {
          const sourceCrop = getCropPixels(box, image.naturalWidth, image.naturalHeight);
          const outputWidth = ratio.outputWidth || sourceCrop.width;
          const outputHeight = ratio.outputHeight || sourceCrop.height;
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Could not create the image canvas."));
            return;
          }
          canvas.width = outputWidth;
          canvas.height = outputHeight;
          context.save();
          context.translate(outputWidth / 2, outputHeight / 2);
          context.rotate((effects.rotation * Math.PI) / 180);
          context.scale(effects.mirror ? -1 : 1, effects.flip ? -1 : 1);
          context.filter = getImageFilter({ ...effects, sharpen: false });
          context.drawImage(
            image,
            sourceCrop.x,
            sourceCrop.y,
            sourceCrop.width,
            sourceCrop.height,
            -outputWidth / 2,
            -outputHeight / 2,
            outputWidth,
            outputHeight
          );
          context.restore();
          if (effects.sharpen) {
            const imageData = context.getImageData(0, 0, outputWidth, outputHeight);
            imageData.data.set(sharpenPixelData(imageData.data, outputWidth, outputHeight));
            context.putImageData(imageData, 0, 0);
          }
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Could not crop this image."));
              return;
            }
            resolve({
              destination,
              sourceCrop,
              croppedFile: new File(
                [blob],
                file.name.replace(
                  /\.[^.]+$/,
                  `-${ratio.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${outputFormat.extension}`
                ),
                { type: outputFormat.mimeType }
              ),
            });
          }, outputFormat.mimeType, outputFormat.quality);
        });

      try {
        const renderedTargets = await Promise.all(renderTargets.map(renderTarget));
        URL.revokeObjectURL(url);
        
        // ----------------------------------------------------------------------
        // 🌟 NEW: Prevents overwriting original files during Backend flow
        // ----------------------------------------------------------------------
        const storesBackendEdit = Boolean(onMediaEditApply);

        const commitCrop = () => {
          if (storesBackendEdit && onMediaEditApply) {
            renderedTargets.forEach(({ destination, sourceCrop, croppedFile }) => {
              if (!destination) return;
              onMediaEditApply(
                file, // 1. ORIGINAL FILE
                {
                  cropX: sourceCrop.x, // 2. MATH
                  cropY: sourceCrop.y,
                  cropWidth: sourceCrop.width,
                  cropHeight: sourceCrop.height,
                  rotation: 0,
                },
                croppedFile, // 3. PREVIEW CANVAS
                destination
              );
            });
          } else {
            // Fallback for standalone frontend editing (Not used in Publish flow)
            const activeResult = renderedTargets.find(
              ({ destination }) => destination && currentDestinationKey === getDestinationKey(destination)
            ) || renderedTargets[0];
            const nextFiles = [...files];
            nextFiles[cropTargetIndex] = activeResult.croppedFile;
            onFilesChange(nextFiles);
          }
        };

        if (cropSession && validateFilesForSelectedChannels) {
          const filesToValidate = storesBackendEdit 
            ? renderedTargets.map(rt => rt.croppedFile) 
            : (() => { 
                const arr = [...files]; 
                arr[cropTargetIndex] = renderedTargets[0].croppedFile; 
                return arr; 
              })();

          const validationErrors = await validateFilesForSelectedChannels(filesToValidate);
          const remainingIndices = cropSession.remainingIndices.filter((index) => index !== cropTargetIndex);
          
          if (validationErrors.length === 0) {
            commitCrop();
            setCropSession(null);
            closeCrop();
            return;
          }
          
          if (areDimensionOnlyErrors(validationErrors) && remainingIndices.length > 0) {
            commitCrop();
            setCropSession({ ...cropSession, remainingIndices });
            initializeCrop(remainingIndices[0]);
            return;
          }
          
          if (!storesBackendEdit) onFilesChange(cropSession.originalFiles);
          setCropSession(null);
          closeCrop();
          alert(`This media still cannot be uploaded:\n\n${validationErrors.join("\n")}`);
          return;
        }

        commitCrop();
        closeCrop();
      } catch (error) {
        URL.revokeObjectURL(url);
        alert(error instanceof Error ? error.message : "Could not crop this image.");
        closeCrop();
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      alert("Could not crop this image.");
      closeCrop();
    };
    image.src = url;
  };

  const cropFile = cropTargetIndex !== null ? files[cropTargetIndex] : null;
  const cropTargetUrl = cropFile ? getStableObjectUrl(cropFile) : "";
  if (cropTargetIndex === null || !cropTargetUrl) return null;

  // Calculate dynamic ratios before render
  const activePlatform = activeCropDestination?.platform || 'instagram';
  const activePlacement = activeCropDestination?.placement || 'FEED';
  const currentRatios = (PLATFORM_CROP_OPTIONS[activePlatform] || PLATFORM_CROP_OPTIONS['instagram'])[activePlacement] || PLATFORM_CROP_OPTIONS['instagram']['FEED'];

  const customRatio: CropRatio = {
    label: "Custom Max Fit",
    sizeLabel: "Custom",
    value: null,
    outputWidth: null,
    outputHeight: null
  };

  const activeRatios = [...currentRatios, customRatio];

  return (
    <div className={styles.cropOverlay}>
      <div className={styles.cropModal}>
        <div className={styles.cropHeader}>
          <h3>{cropSession ? "Crop to upload" : "Edit Image"}</h3>
          <div className={styles.cropHeaderInfo}>
            <strong>{cropRatio.label}</strong>
            {cropRatio.outputWidth && cropRatio.outputHeight
              ? ` · ${cropRatio.outputWidth}x${cropRatio.outputHeight}`
              : " · Fit to platform maximum constraints"}
          </div>
          <button type="button" onClick={cancelCrop} aria-label="Close">
            ×
          </button>
        </div>

        {cropDestinations.length > 0 && (
          <div className={styles.cropDestinationSection}>
            <div className={styles.cropDestinationHeading}>
              <strong>Preview by channel</strong>
              <span>Select a post and crop its image directly.</span>
            </div>
            <div className={styles.cropDestinationGrid}>
              {cropDestinations.map((destination) => {
                const key = getDestinationKey(destination);
                const isActive = activeCropDestination
                  ? getDestinationKey(activeCropDestination) === key
                  : false;
                const destinationBox = isActive ? cropBox : destinationCropBoxes[key];
                const cardEffects = isActive
                  ? imageEffects
                  : destinationImageEffects[key] || createDefaultImageEffects();
                const isConfirmed = Boolean(confirmedCropDestinations[key]);
                const isEditing = isActive && !isConfirmed;
                const cardRatio = isActive
                  ? cropRatio
                  : destinationCropRatios[key] || getDestinationRatio(destination);

                return (
                  <div
                    key={key}
                    className={`${styles.cropDestinationCard} ${isActive ? styles.cropDestinationCardActive : ""}`}
                    onClick={() => selectCropDestination(destination)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectCropDestination(destination);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                  >
                    <span className={styles.cropDestinationPostHeader}>
                      <span className={styles.cropDestinationIcon} aria-hidden="true">
                        {destination.platform.charAt(0).toUpperCase()}
                      </span>
                      <span><strong>{destination.label}</strong><small>Image preview</small></span>
                      <span className={styles.cropDestinationMenu} aria-hidden="true">•••</span>
                    </span>
                    <span
                      ref={isEditing ? cropPreviewRef : undefined}
                      className={styles.cropDestinationMedia}
                      style={{
                        aspectRatio: isEditing && cropImageDimensions.width && cropImageDimensions.height
                          ? `${cropImageDimensions.width} / ${cropImageDimensions.height}`
                          : cardRatio.value || destination.ratio,
                      }}
                    >
                      <img
                        src={cropTargetUrl}
                        alt={`${destination.label} preview`}
                        onLoad={(event) => {
                          const dimensions = {
                            width: event.currentTarget.naturalWidth,
                            height: event.currentTarget.naturalHeight,
                          };
                          const savedEdit = cropFile instanceof File
                            ? getSavedMediaEdit?.(cropFile, destination)
                            : undefined;
                          const hydratedBox = savedEdit
                            ? savedEditToCropBox(savedEdit, dimensions.width, dimensions.height)
                            : createCropBox(dimensions.width, dimensions.height, destination.ratio);
                          const hydratedRatio = savedEdit
                            ? cropRatioFromSavedEdit(savedEdit, destination.platform, destination.placement)
                            : getDestinationRatio(destination);
                          if (!destinationCropBoxes[key]) {
                            setDestinationCropBoxes((current) => ({ ...current, [key]: hydratedBox }));
                          }
                          if (!destinationCropRatios[key]) {
                            setDestinationCropRatios((current) => ({ ...current, [key]: hydratedRatio }));
                          }
                          if (isActive) {
                            setCropImageDimensions(dimensions);
                            if (!destinationCropBoxes[key]) setCropBox(hydratedBox);
                            if (!destinationCropRatios[key]) setCropRatio(hydratedRatio);
                          }
                        }}
                        style={{
                          transform: getImageTransform({
                            zoom: 1,
                            rotation: cardEffects.rotation,
                            mirror: cardEffects.mirror,
                            flip: cardEffects.flip,
                          }),
                          filter: getImageFilter(cardEffects),
                          objectFit: isEditing ? "fill" : "cover",
                          objectPosition: destinationBox
                            ? `${destinationBox.x + destinationBox.width / 2}% ${destinationBox.y + destinationBox.height / 2}%`
                            : "50% 50%",
                          ...(isConfirmed && destinationBox
                            ? {
                                position: "absolute" as const,
                                width: `${10000 / destinationBox.width}%`,
                                height: `${10000 / destinationBox.height}%`,
                                left: `${(-destinationBox.x * 100) / destinationBox.width}%`,
                                top: `${(-destinationBox.y * 100) / destinationBox.height}%`,
                                objectFit: "fill" as const,
                              }
                            : {}),
                        }}
                      />
                      {isEditing && (
                        <span
                          className={styles.cropSelection}
                          style={{
                            left: `${cropBox.x}%`,
                            top: `${cropBox.y}%`,
                            width: `${cropBox.width}%`,
                            height: `${cropBox.height}%`,
                          }}
                          onPointerDown={(event) => startCropInteraction(event, "move")}
                          onPointerMove={updateCropFromPointer}
                          onPointerUp={stopCropInteraction}
                          onPointerCancel={stopCropInteraction}
                        >
                          <span className={styles.cropGrid} aria-hidden="true" />
                          {(["n", "ne", "e", "se", "s", "sw", "w", "nw"] as CropHandle[]).map((handle) => (
                            <button
                              key={handle}
                              type="button"
                              className={`${styles.cropHandle} ${styles[`cropHandle${handle.toUpperCase()}`]}`}
                              aria-label={`Resize ${destination.label} crop ${handle}`}
                              onPointerDown={(event) => startCropInteraction(event, "resize", handle)}
                              onPointerMove={updateCropFromPointer}
                              onPointerUp={stopCropInteraction}
                              onPointerCancel={stopCropInteraction}
                            />
                          ))}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <span className={styles.cropDestinationEditControls}>
                        <button type="button" onClick={(event) => { event.stopPropagation(); resetActiveEdit(); }} aria-label="Reset selected crop" title="Reset">
                          <RotateCcw size={14} /> Reset
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); undoActiveEdit(); }} disabled={!destinationEditHistory[key]?.past.length} aria-label="Undo selected image edit" title="Undo">
                          <Undo2 size={15} />
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); redoActiveEdit(); }} disabled={!destinationEditHistory[key]?.future.length} aria-label="Redo selected image edit" title="Redo">
                          <Redo2 size={15} />
                        </button>
                        <button type="button" className={isConfirmed ? styles.cropConfirmedButton : ""} onClick={(event) => { event.stopPropagation(); confirmActiveCrop(); }} aria-label="Confirm selected crop" title="Confirm crop">
                          <Check size={16} />
                        </button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.cropControls}>
          <div className={styles.cropRecommendations}>
            <span>Crop ratio</span>
            <div className={styles.recommendationGrid}>
              {/* 🌟 NEW: Dynamic Ratio Button Mapping */}
              {activeRatios.map((ratio) => (
                <button
                  key={ratio.label}
                  type="button"
                  className={
                    (cropRatio.value === null && ratio.value === null) ||
                    (cropRatio.value !== null && ratio.value !== null && Math.abs(cropRatio.value - ratio.value) < 0.002)
                      ? styles.selectedRecommendation
                      : ""
                  }
                  onClick={() => selectCropRatio(ratio)}
                >
                  <span>{ratio.sizeLabel}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.imageEffectsGroup}>
            <span>Image adjustments</span>
            <div className={styles.imageEffectsGrid}>
              <button type="button" onClick={rotateImage}>Rotate <strong>{imageEffects.rotation}°</strong></button>
              {([
                ["mirror", "Mirror"],
                ["flip", "Flip"],
                ["blur", "Blur"],
                ["sharpen", "Sharpen"],
                ["enhance", "Enhance"],
                ["grayscale", "Grayscale"],
                ["invert", "Invert"],
              ] as const).map(([effect, label]) => (
                <button
                  key={effect}
                  type="button"
                  className={imageEffects[effect] ? styles.imageEffectActive : ""}
                  onClick={() => toggleImageEffect(effect)}
                  aria-pressed={imageEffects[effect]}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.cropActions}>
          <button type="button" onClick={cancelCrop}>Cancel</button>
          <button type="button" onClick={applyCrop}>Apply</button>
        </div>
      </div>
    </div>
  );
});

export default Cropfeature;