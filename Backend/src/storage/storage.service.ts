import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.storage = new Storage({
      credentials: JSON.parse(this.config.get('GCP_JSON_KEY')!), 
      projectId: this.config.get('GCP_PROJECT_ID'),
    });
    this.bucket = this.config.get('GCP_BUCKET_NAME')!;
  }

  async getPresignedUrl(fileName: string, contentType: string, userId: number) {
    const storagePath = `uploads/${userId}/${Date.now()}-${fileName}`;
    const file = this.storage.bucket(this.bucket).file(storagePath);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    return {
      uploadUrl,    
      publicUrl: `https://storage.googleapis.com/${this.bucket}/${storagePath}`, 
      storagePath   
    };
  }

  // ✅ ADD THIS METHOD for your Processor to work with Private Buckets
  async getSignedReadUrl(storagePath: string): Promise<string> {
    const file = this.storage.bucket(this.bucket).file(storagePath);
    
    // Check if file exists first to avoid 404 errors
    const [exists] = await file.exists();
    if (!exists) {
        throw new Error(`File not found in storage: ${storagePath}`);
    }

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // Valid for 1 hour (enough for FB/IG to download)
    });

    return url;
  }

  async deleteFile(storagePath: string) {
    try {
      const file = this.storage.bucket(this.bucket).file(storagePath);
      await file.delete();
      console.log(`🗑️ Deleted file from GCS: ${storagePath}`);
      return true;
    } catch (error) {
      // ✅ Perfect safety net. Logs the error but doesn't crash the app.
      console.warn(`Failed to delete file ${storagePath}:`, error.message);
      return false;
    }
  }
}