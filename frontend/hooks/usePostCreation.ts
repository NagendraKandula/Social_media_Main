// frontend/hooks/usePostCreation.ts
import { useState } from 'react';
import apiClient from '../lib/axios'; // Your configured axios
import axios from 'axios'; // Standard axios for Cloud upload

export const usePostCreation = () => {
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 1. Upload Helper
  const uploadMedia = async (file: File) => {
    setUploading(true);
    try {
      // A. Get Signed SAS URL from Backend
      const { data } = await apiClient.get('/posting/presigned-url', {
        params: { 
          fileName: file.name, 
          contentType: file.type 
        }
      });

      const { uploadUrl, publicUrl, storagePath } = data;

      // B. Upload directly to Azure (Bypassing Backend)
      await axios.put(uploadUrl, file, {
        headers: { 
          'Content-Type': file.type,
          'x-ms-blob-type': 'BlockBlob' // 🌟 CRITICAL FOR AZURE 🌟
        }
      });

      return { publicUrl, storagePath };
    } catch (error) {
      console.error("Upload failed", error);
      throw new Error("Failed to upload media to cloud.");
    } finally {
      // ✅ Added this to ensure loading state clears
      setUploading(false); 
    }
  };

  // Upload Multiple Helper
  const uploadMultipleMedia = async(files: File[]) => {
    setUploading(true);
    try {
      const uploadPromises = files.map(file => uploadMedia(file));
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
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

  return { uploadMedia, uploadMultipleMedia, createPost, uploading, publishing };
};