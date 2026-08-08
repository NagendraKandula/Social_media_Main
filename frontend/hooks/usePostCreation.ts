// frontend/hooks/usePostCreation.ts
import { useState } from 'react';
import apiClient from '../lib/axios'; // Your configured axios
import axios from 'axios'; // Standard axios for Google upload

const readOriginalImageMetadata = (file: File) => {
  if (!file.type.startsWith('image/')) {
    return Promise.resolve<{ width?: number; height?: number }>({});
  }

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read image dimensions for ${file.name}.`));
    };
    image.src = url;
  });
};

export const usePostCreation = () => {
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 1. Upload Helper
  const uploadMedia = async (file: File) => {
    setUploading(true);
    try {
      const metadata: { width?: number; height?: number } =
        await readOriginalImageMetadata(file).catch(() => ({}));
      // A. Get Signed URL from Backend
      const { data } = await apiClient.get('/posting/presigned-url', {
        params: { 
          fileName: file.name, 
          contentType: file.type 
        }
      });
      // ✅ FIX: Correctly extract `storagePath` from the backend response
      const { uploadUrl, storagePath } = data;

      // B. Upload to Google (Bypassing Backend)
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type }
      });

      // C. Register Media in the Database
      const mediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      
      const mediaRes = await apiClient.post('/posting/media/register', {
        gcsPath: storagePath,  // ✅ FIX: Map the backend's storagePath to the DB's gcsPath
        fileType: mediaType,
        width: metadata.width,
        height: metadata.height,
        fileSizeBytes: file.size,
      });

      console.log(`[Frontend] ☁️ Successfully uploaded to GCP! Path: ${storagePath} | DB Media ID: ${mediaRes.data.id}`);

      setUploading(false);
      
      // D. Return the ID along with the paths
      return { 
        id: mediaRes.data.id, 
        gcsPath: storagePath // ✅ FIX: Return it here so Publish.tsx can use it if needed
      };
    } catch (error) {
      setUploading(false);
      console.error("Upload failed", error);
      throw new Error("Failed to upload media to cloud.");
    }
  };

    const uploadMultipleMedia = async(files:File[]) =>{
        setUploading(true);
        try{
          const uploadPromises = files.map(file =>uploadMedia(file));
          const results = await Promise.all(uploadPromises);
          return results;

        }
        
      
    catch (error) {
      console.error("Upload failed", error);
      throw new Error("Failed to upload media to cloud.");
    } finally {
      setUploading(false);
    }
  };

  // 2. Create Post Helper
  const createPost = async (payload: any) => {
    setPublishing(true);
    try {
      const { data } = await apiClient.post('/posting/create', payload);
      return data;
    } catch (error) {
      console.error("Posting failed", error);
      throw error;
    } finally {
      setPublishing(false);
    }
  };

  return { uploadMedia,uploadMultipleMedia, createPost, uploading, publishing };
};
