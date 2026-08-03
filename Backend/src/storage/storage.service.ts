import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private config: ConfigService) {
    this.storage = new Storage({
      credentials: JSON.parse(this.config.get('GCP_JSON_KEY')!), 
      projectId: this.config.get('GCP_PROJECT_ID'),
    });
    this.bucket = this.config.get('GCP_BUCKET_NAME')!;
  }

  async getPresignedUrl(fileName: string, contentType: string, userId: number) {
    // 1. Sanitize the filename to prevent signature errors with spaces/special chars
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const gcsPath = `uploads/${userId}/${Date.now()}-${sanitizedFileName}`;
    
    const file = this.storage.bucket(this.bucket).file(gcsPath);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    return {
      uploadUrl,
      storagePath:gcsPath // 2. Renamed to match your new Prisma schema terminology
      // Removed publicUrl since the bucket is private and it would throw a 403 anyway
    };
  }

  async getSignedReadUrl(gcsPath: string, contentType?: string): Promise<string> {
    const file = this.storage.bucket(this.bucket).file(gcsPath);
    
    // Check if file exists first to avoid 404 errors
    const [exists] = await file.exists();
    if (!exists) {
        throw new Error(`File not found in storage: ${gcsPath}`);
    }

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // Valid for 1 hour
      responseType: contentType,
    });

    return url;
  }

  async deleteFile(gcsPath: string) {
    try {
      const file = this.storage.bucket(this.bucket).file(gcsPath);
      await file.delete();
      this.logger.log(`🗑️ Deleted file from GCS: ${gcsPath}`);
      return true;
    } catch (error: any) {
      // Perfect safety net. Logs the error but doesn't crash the app.
      this.logger.warn(`Failed to delete file ${gcsPath}: ${error.message}`);
      return false;
    }
  }
}