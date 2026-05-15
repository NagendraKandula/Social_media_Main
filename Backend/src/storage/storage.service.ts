import { Injectable } from '@nestjs/common';
import { BlobServiceClient, ContainerClient, BlobSASPermissions } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
 
@Injectable()
export class StorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  constructor(private config: ConfigService) {
    const connectionString = this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING')!;
    const containerName = this.config.get<string>('AZURE_CONTAINER_NAME')!;

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(containerName);}

  async getPresignedUrl(fileName: string, contentType: string, userId: number) {
    const storagePath = `uploads/${userId}/${Date.now()}-${fileName}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(storagePath);

    // Generate a Shared Access Signature (SAS) token valid for 15 minutes
    const uploadUrl = await blockBlobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse('w'), // 'w' = write permission
      expiresOn: new Date(Date.now() + 15 * 60 * 1000), 
      contentType: contentType,
    });

    return {
      uploadUrl,    
      // URL without the secret SAS token attached
      publicUrl: blockBlobClient.url, 
      storagePath   
    };
  }

  // ✅ ADD THIS METHOD for your Processor to work with Private Buckets
  async getSignedReadUrl(storagePath: string): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storagePath);
    
    // Check if file exists first to avoid 404 errors
    const exists = await blockBlobClient.exists();
    if (!exists) {
        throw new Error(`File not found in storage: ${storagePath}`);
    }

    // Generate a read-only SAS token valid for 1 hour
    const readUrl = await blockBlobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'), // 'r' = read permission
      expiresOn: new Date(Date.now() + 60 * 60 * 1000), 
    });

    return readUrl;
  }

  async deleteFile(storagePath: string) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(storagePath);
      await blockBlobClient.delete();
      console.log(`🗑️ Deleted file from Azure: ${storagePath}`);
      return true;
    } catch (error : any) {
      // Safety net: Logs the error but doesn't crash the worker queue
      console.warn(`Failed to delete file ${storagePath}:`, error.message);
      return false;
    }
  }
}