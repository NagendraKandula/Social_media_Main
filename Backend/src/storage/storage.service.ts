import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucket: string;
 
  constructor(private config: ConfigService) {
    this.storage = new Storage({
      credentials: JSON.parse(this.config.get('GCP_JSON_KEY')!), // Ensure this env var exists
      projectId: this.config.get('GCP_PROJECT_ID'),
    });
    this.bucket = this.config.get('GCP_BUCKET_NAME')!;
  }

  async getPresignedUrl(fileName: string, contentType: string, userId: number) {
    // Structure: uploads/{userId}/{timestamp}-{filename}
    const storagePath = `uploads/${userId}/${Date.now()}-${fileName}`;
    const file = this.storage.bucket(this.bucket).file(storagePath);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    return {
      uploadUrl,    // Send to Frontend (PUT request)
      publicUrl: `https://storage.googleapis.com/${this.bucket}/${storagePath}`, // Save to DB
      storagePath   // Save to DB (for cleanup)
    };
  }
}