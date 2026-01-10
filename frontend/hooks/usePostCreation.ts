// frontend/hooks/usePostCreation.ts
import { useState } from 'react';
import apiClient from '../lib/axios'; // Your configured axios
import axios from 'axios'; // Standard axios for Google upload

export const usePostCreation = () => {
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 1. Upload Helper
  const uploadMedia = async (file: File) => {
    setUploading(true);
    try {
      // A. Get Signed URL from Backend
      const { data } = await apiClient.get('/posting/presigned-url', {
        params: { 
          fileName: file.name, 
          contentType: file.type 
        }
      });

      const { uploadUrl, publicUrl, storagePath } = data;

      // B. Upload to Google (Bypassing Backend)
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type }
      });

      return { publicUrl, storagePath };
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

  return { uploadMedia, createPost, uploading, publishing };
};