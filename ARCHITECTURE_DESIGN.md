# Social Media Management Platform - Architecture Design

## Table of Contents
1. [Overview](#overview)
2. [Pre-Signed URL Architecture (Google Cloud Storage)](#pre-signed-url-architecture)
3. [Multiposting Architecture](#multiposting-architecture)
4. [Scheduling Architecture](#scheduling-architecture)
5. [Database Schema Extensions](#database-schema-extensions)
6. [Queue & Job Processing System](#queue--job-processing-system)
7. [Error Handling & Retry Strategy](#error-handling--retry-strategy)
8. [System Flow Diagrams](#system-flow-diagrams)

---

## Overview

This document outlines the architecture for:
- **Pre-signed URL system** using Google Cloud Storage (GCS) for secure media handling
- **Multiposting system** for simultaneous posting to multiple platforms
- **Scheduling system** for delayed/planned content publishing

### Current State
- ✅ OAuth integration for all platforms (Facebook, LinkedIn, Instagram, YouTube, Threads, Twitter)
- ✅ Individual posting endpoints for each platform
- ✅ Media handling via public URLs (Cloudinary)
- ❌ No multiposting capability
- ❌ No scheduling system
- ❌ No pre-signed URL implementation

### Target State
- ✅ Pre-signed URLs for secure, temporary media access
- ✅ Unified multiposting endpoint
- ✅ Job queue system for scheduling
- ✅ Retry mechanism for failed posts
- ✅ Status tracking for all posts

---

## Pre-Signed URL Architecture

### 1. Google Cloud Storage Setup

#### Storage Structure
```
gs://your-bucket-name/
├── media/
│   ├── images/
│   │   └── {userId}/{timestamp}-{uuid}.{ext}
│   ├── videos/
│   │   └── {userId}/{timestamp}-{uuid}.{ext}
│   └── reels/
│       └── {userId}/{timestamp}-{uuid}.{ext}
└── temp/
    └── {userId}/{uploadId}/  (for multipart uploads)
```

#### Service Account Permissions
- **Storage Object Admin** role for backend service account
- **Storage Object Viewer** role for public read (if needed)
- IAM conditions for time-based access

### 2. Pre-Signed URL Generation Flow

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 1. Request upload URL
       ▼
┌─────────────────────┐
│  Backend API        │
│  /media/upload-url  │
└──────┬──────────────┘
       │ 2. Generate pre-signed URL
       │    - Expiry: 1 hour (upload)
       │    - Method: PUT
       │    - Content-Type: from file
       ▼
┌─────────────────────┐
│  Google Cloud       │
│  Storage API        │
└─────────────────────┘
       │
       │ 3. Return pre-signed URL
       ▼
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 4. Upload file directly to GCS
       ▼
┌─────────────────────┐
│  Google Cloud       │
│  Storage (Bucket)   │
└─────────────────────┘
       │
       │ 5. Notify backend (webhook/callback)
       ▼
┌─────────────────────┐
│  Backend API        │
│  /media/confirm     │
└─────────────────────┘
```

### 3. Pre-Signed URL Types

#### A. Upload URL (PUT)
- **Purpose**: Frontend uploads media directly to GCS
- **Expiry**: 1 hour
- **Method**: PUT
- **Headers**: Content-Type, Content-Length
- **Response**: GCS object path (gs://bucket/path)

#### B. Read URL (GET)
- **Purpose**: Backend generates temporary URL for platform APIs
- **Expiry**: 24 hours (sufficient for platform processing)
- **Method**: GET
- **Usage**: Passed to social media platform APIs

#### C. Delete URL (DELETE)
- **Purpose**: Cleanup after successful posting (optional)
- **Expiry**: 1 hour
- **Method**: DELETE

### 4. Implementation Components

#### Backend Service: `MediaStorageService`
```
Responsibilities:
- Generate pre-signed upload URLs
- Generate pre-signed read URLs
- Store media metadata in database
- Handle GCS webhook notifications
- Cleanup expired media
```

#### Database Model: `Media`
```
Media {
  id: UUID
  userId: Int
  fileName: String
  fileType: String (IMAGE/VIDEO/REEL)
  gcsPath: String (gs://bucket/path)
  publicUrl: String? (if needed)
  size: Int (bytes)
  mimeType: String
  uploadedAt: DateTime
  expiresAt: DateTime
  status: String (UPLOADING/UPLOADED/FAILED/DELETED)
}
```

### 5. Security Considerations

- **Bucket Policy**: Private by default
- **CORS Configuration**: Allow PUT from frontend domain only
- **Signed URL Expiry**: Short-lived (1 hour for upload, 24 hours for read)
- **Content Validation**: Verify file type and size before generating URL
- **Rate Limiting**: Limit pre-signed URL generation per user

---

## Multiposting Architecture

### 1. Unified Posting Endpoint

#### Endpoint: `POST /posts/multipost`

**Request Body:**
```json
{
  "content": "Post content text",
  "media": {
    "type": "IMAGE|VIDEO|REEL",
    "gcsPath": "gs://bucket/path/to/file"
  },
  "platforms": [
    {
      "platform": "facebook",
      "pageId": "optional-page-id",
      "mediaType": "IMAGE|VIDEO|STORY|REEL"
    },
    {
      "platform": "twitter",
      "mediaType": "IMAGE|VIDEO"
    },
    {
      "platform": "instagram",
      "mediaType": "IMAGE|REEL|STORIES"
    },
    {
      "platform": "linkedin",
      "mediaType": "IMAGE|VIDEO"
    },
    {
      "platform": "threads",
      "mediaType": "IMAGE|VIDEO"
    },
    {
      "platform": "youtube",
      "title": "Video title",
      "description": "Video description"
    }
  ],
  "scheduleAt": "2024-01-15T10:00:00Z" // Optional
}
```

### 2. Multiposting Flow

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 1. POST /posts/multipost
       │    (with selected platforms)
       ▼
┌─────────────────────┐
│  Multipost Service  │
│  - Validate request │
│  - Check auth       │
│  - Generate read URL│
└──────┬──────────────┘
       │
       ├─ If scheduled → Queue Job
       │                 │
       │                 ▼
       │          ┌──────────────┐
       │          │ Job Queue    │
       │          │ (Bull/Redis) │
       │          └──────────────┘
       │
       └─ If immediate → Execute in parallel
                          │
                          ▼
          ┌───────────────────────────────┐
          │  Platform Posting Workers     │
          │  (Parallel Execution)         │
          ├───────────────────────────────┤
          │ • Facebook Worker              │
          │ • Twitter Worker               │
          │ • Instagram Worker             │
          │ • LinkedIn Worker              │
          │ • Threads Worker               │
          │ • YouTube Worker               │
          └───────┬───────────────────────┘
                  │
                  ▼
          ┌─────────────────────┐
          │  Result Aggregator  │
          │  - Collect results  │
          │  - Update database  │
          │  - Return response  │
          └─────────────────────┘
```

### 3. Parallel Execution Strategy

#### Option A: Promise.all (Simple)
- **Pros**: Simple, fast for small batches
- **Cons**: One failure affects all, no retry per platform
- **Use Case**: Immediate posting, small number of platforms

#### Option B: Promise.allSettled (Recommended)
- **Pros**: Independent execution, partial success handling
- **Cons**: Still synchronous wait
- **Use Case**: Immediate posting with error tolerance

#### Option C: Queue-based (Best for Scale)
- **Pros**: Scalable, retry per platform, monitoring
- **Cons**: More complex setup
- **Use Case**: Production, high volume, scheduling

### 4. Response Format

```json
{
  "postId": "uuid",
  "status": "SUCCESS|PARTIAL|FAILED",
  "results": [
    {
      "platform": "facebook",
      "status": "SUCCESS|FAILED",
      "postId": "platform-post-id",
      "error": null
    },
    {
      "platform": "twitter",
      "status": "FAILED",
      "postId": null,
      "error": "Rate limit exceeded"
    }
  ],
  "scheduledAt": null,
  "createdAt": "2024-01-15T09:00:00Z"
}
```

---

## Scheduling Architecture

### 1. Job Queue System

#### Technology Stack
- **Queue**: Bull (Redis-based)
- **Storage**: Redis
- **Scheduler**: Bull's built-in delayed jobs

#### Queue Structure
```
Queues:
├── post-queue (main posting queue)
│   ├── immediate-posts (priority: high)
│   └── scheduled-posts (priority: normal)
├── retry-queue (failed posts)
└── cleanup-queue (media cleanup)
```

### 2. Scheduling Flow

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 1. POST /posts/multipost
       │    with scheduleAt timestamp
       ▼
┌─────────────────────┐
│  Multipost Service  │
│  - Validate schedule│
│  - Create Post record│
│  - Create Job        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Database           │
│  - Post record      │
│  - Status: SCHEDULED│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Bull Queue         │
│  - Add delayed job  │
│  - Delay: scheduleAt│
└──────┬──────────────┘
       │
       │ (Wait until scheduleAt)
       │
       ▼
┌─────────────────────┐
│  Post Worker        │
│  - Process job      │
│  - Execute multipost│
│  - Update status    │
└─────────────────────┘
```

### 3. Job Processing

#### Worker Configuration
```javascript
Worker {
  concurrency: 5,           // Process 5 jobs simultaneously
  attempts: 3,               // Retry 3 times on failure
  backoff: {
    type: 'exponential',
    delay: 2000              // Start with 2s, double each retry
  },
  removeOnComplete: true,   // Remove completed jobs
  removeOnFail: false       // Keep failed jobs for analysis
}
```

#### Job Data Structure
```json
{
  "postId": "uuid",
  "userId": 123,
  "content": "Post content",
  "media": {
    "gcsPath": "gs://bucket/path",
    "type": "IMAGE"
  },
  "platforms": [...],
  "scheduledAt": "2024-01-15T10:00:00Z"
}
```

### 4. Cron Jobs for Maintenance

#### Daily Scheduled Post Checker
- **Frequency**: Every minute
- **Purpose**: Check for posts scheduled in the next minute
- **Action**: Trigger immediate processing if missed

#### Failed Post Retry
- **Frequency**: Every 5 minutes
- **Purpose**: Retry posts that failed due to transient errors
- **Action**: Re-queue with exponential backoff

#### Media Cleanup
- **Frequency**: Daily at 2 AM
- **Purpose**: Delete expired media files
- **Action**: Remove files older than 30 days

---

## Database Schema Extensions

### 1. Post Model

```prisma
model Post {
  id            String   @id @default(uuid())
  userId        Int
  content       String
  status        PostStatus @default(SCHEDULED)
  scheduledAt   DateTime?
  publishedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  user          User     @relation(fields: [userId], references: [id])
  media         Media?   @relation(fields: [mediaId], references: [id])
  mediaId       String?
  platformPosts PlatformPost[]
  
  @@index([userId, status])
  @@index([scheduledAt])
}

enum PostStatus {
  DRAFT
  SCHEDULED
  PUBLISHING
  PUBLISHED
  FAILED
  CANCELLED
}
```

### 2. PlatformPost Model

```prisma
model PlatformPost {
  id            String   @id @default(uuid())
  postId        String
  platform      String   // facebook, twitter, instagram, etc.
  platformPostId String? // ID returned by platform API
  status        PlatformPostStatus @default(PENDING)
  error         String?
  retryCount    Int      @default(0)
  publishedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  post          Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  @@index([postId])
  @@index([platform, status])
}

enum PlatformPostStatus {
  PENDING
  PUBLISHING
  SUCCESS
  FAILED
  RETRYING
}
```

### 3. Media Model

```prisma
model Media {
  id            String   @id @default(uuid())
  userId        Int
  fileName      String
  fileType      String   // IMAGE, VIDEO, REEL
  gcsPath       String   // gs://bucket/path
  publicUrl     String?  // Pre-signed URL (temporary)
  size          Int      // bytes
  mimeType      String
  uploadedAt    DateTime @default(now())
  expiresAt     DateTime
  status        MediaStatus @default(UPLOADING)
  
  // Relations
  user          User     @relation(fields: [userId], references: [id])
  posts         Post[]
  
  @@index([userId])
  @@index([expiresAt])
}

enum MediaStatus {
  UPLOADING
  UPLOADED
  FAILED
  DELETED
}
```

### 4. JobLog Model (Optional - for monitoring)

```prisma
model JobLog {
  id            String   @id @default(uuid())
  jobId         String   // Bull job ID
  postId        String
  status        String
  error         String?
  duration      Int?     // milliseconds
  createdAt     DateTime @default(now())
  
  @@index([postId])
  @@index([createdAt])
}
```

---

## Queue & Job Processing System

### 1. Queue Architecture

```
┌─────────────────────────────────────────┐
│           Redis Instance                │
│  ┌───────────────────────────────────┐  │
│  │  Bull Queue: post-queue          │  │
│  │  - Delayed jobs (scheduled)      │  │
│  │  - Immediate jobs                │  │
│  └──────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Bull Queue: retry-queue         │  │
│  │  - Failed jobs to retry          │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      NestJS Worker Processes            │
│  ┌───────────────────────────────────┐  │
│  │  PostWorker (5 concurrent)        │  │
│  │  - Process multipost jobs         │  │
│  │  - Execute platform posts         │  │
│  │  - Update database                │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  RetryWorker (3 concurrent)       │  │
│  │  - Retry failed posts             │  │
│  │  - Exponential backoff            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 2. Job Types

#### A. Immediate Post Job
- **Queue**: `post-queue`
- **Priority**: High
- **Delay**: 0
- **Processing**: Execute immediately

#### B. Scheduled Post Job
- **Queue**: `post-queue`
- **Priority**: Normal
- **Delay**: Calculated from `scheduledAt - now()`
- **Processing**: Execute at scheduled time

#### C. Retry Job
- **Queue**: `retry-queue`
- **Priority**: Low
- **Delay**: Exponential backoff (2s, 4s, 8s)
- **Processing**: Retry failed platform posts

### 3. Worker Implementation

#### Post Worker
```
Process Flow:
1. Receive job from queue
2. Update Post status → PUBLISHING
3. Generate pre-signed read URL for media
4. Execute platform posts in parallel (Promise.allSettled)
5. Update PlatformPost records with results
6. Update Post status → PUBLISHED or FAILED
7. Log job completion
```

#### Retry Worker
```
Process Flow:
1. Receive failed job from retry-queue
2. Check retry count (max 3)
3. If retry count < 3:
   - Increment retry count
   - Re-queue with backoff
4. If retry count >= 3:
   - Mark as permanently failed
   - Notify user
```

---

## Error Handling & Retry Strategy

### 1. Error Categories

#### A. Transient Errors (Retry)
- Rate limiting (429)
- Network timeouts
- Temporary API unavailability (503)
- Token refresh needed (401 → refresh → retry)

#### B. Permanent Errors (No Retry)
- Invalid credentials (401 after refresh)
- Invalid content (400)
- Permission denied (403)
- File not found (404)

#### C. Platform-Specific Errors
- **Facebook**: Token expired → Refresh → Retry
- **Twitter**: Rate limit → Wait → Retry
- **Instagram**: Media processing → Poll status → Retry
- **LinkedIn**: Asset upload failed → Retry upload

### 2. Retry Strategy

```
Retry Logic:
├── Attempt 1: Immediate
├── Attempt 2: After 2 seconds
├── Attempt 3: After 4 seconds
└── Attempt 4: After 8 seconds (final)

If all retries fail:
├── Mark PlatformPost as FAILED
├── Update Post status (if all platforms failed → FAILED)
└── Notify user via email/in-app notification
```

### 3. Error Response Format

```json
{
  "platform": "twitter",
  "status": "FAILED",
  "error": {
    "code": "RATE_LIMIT",
    "message": "Rate limit exceeded",
    "retryable": true,
    "retryAfter": 900, // seconds
    "attempts": 2,
    "maxAttempts": 3
  }
}
```

### 4. Monitoring & Alerts

#### Metrics to Track
- Job success rate
- Average processing time
- Retry rate per platform
- Failed posts per day
- Queue depth

#### Alerts
- High failure rate (>10%)
- Queue backlog (>1000 jobs)
- Worker process down
- Redis connection issues

---

## System Flow Diagrams

### 1. Complete Multiposting Flow (Immediate)

```
User Action
    │
    ▼
Frontend: Select platforms + content + media
    │
    ▼
Backend: POST /posts/multipost
    │
    ├─► Validate request
    ├─► Check user authentication
    ├─► Generate pre-signed read URL (24h expiry)
    └─► Create Post record (status: PUBLISHING)
        │
        ▼
    Create PlatformPost records (status: PENDING)
        │
        ▼
    Execute platform posts in parallel
        │
        ├─► Facebook Service → Post
        ├─► Twitter Service → Post
        ├─► Instagram Service → Post
        ├─► LinkedIn Service → Post
        ├─► Threads Service → Post
        └─► YouTube Service → Post
            │
            ▼
    Aggregate results
        │
        ├─► Update PlatformPost records
        ├─► Update Post status
        └─► Return response to frontend
```

### 2. Complete Scheduling Flow

```
User Action: Schedule Post
    │
    ▼
Frontend: POST /posts/multipost (with scheduleAt)
    │
    ▼
Backend: Multipost Service
    │
    ├─► Validate schedule (must be future)
    ├─► Create Post record (status: SCHEDULED)
    ├─► Create PlatformPost records (status: PENDING)
    └─► Create Bull job (delayed)
        │
        ▼
    Redis Queue: Store job
        │
        │ (Wait until scheduled time)
        │
        ▼
    Bull Worker: Process job
        │
        ├─► Update Post status → PUBLISHING
        ├─► Generate pre-signed read URL
        └─► Execute multipost (same as immediate)
            │
            ▼
        Update database with results
```

### 3. Media Upload Flow (Pre-Signed URL)

```
User: Select file
    │
    ▼
Frontend: Request upload URL
    │
    POST /media/upload-url
    Body: { fileName, fileType, mimeType, size }
    │
    ▼
Backend: MediaStorageService
    │
    ├─► Validate file (type, size)
    ├─► Generate GCS path
    ├─► Generate pre-signed PUT URL (1h expiry)
    └─► Create Media record (status: UPLOADING)
        │
        ▼
    Return pre-signed URL to frontend
        │
        ▼
Frontend: Upload file directly to GCS
    │
    PUT {pre-signed-url}
    Body: file binary
    │
        ▼
    GCS: Store file
        │
        ▼
Frontend: Notify backend
    │
    POST /media/confirm
    Body: { mediaId, uploadId }
    │
        ▼
Backend: Update Media record
    │
    ├─► Status → UPLOADED
    └─► Store GCS path
        │
        ▼
    Return mediaId to frontend
        │
        ▼
Frontend: Use mediaId in multipost request
```

### 4. Retry Flow

```
Platform Post Fails
    │
    ▼
Check Error Type
    │
    ├─► Transient Error? → YES
    │   │
    │   ├─► Retry count < 3? → YES
    │   │   │
    │   │   ├─► Increment retry count
    │   │   ├─► Calculate backoff delay
    │   │   └─► Re-queue job
    │   │
    │   └─► Retry count >= 3? → YES
    │       │
    │       └─► Mark as FAILED (permanent)
    │
    └─► Permanent Error? → YES
        │
        └─► Mark as FAILED (no retry)
            │
            ▼
    Update PlatformPost status
        │
        ▼
    Check if all platforms failed
        │
        ├─► All failed? → Update Post status → FAILED
        └─► Some succeeded? → Update Post status → PARTIAL
            │
            ▼
    Notify user
```

---

## Implementation Priority

### Phase 1: Pre-Signed URLs (Week 1-2)
1. Set up Google Cloud Storage bucket
2. Create MediaStorageService
3. Implement upload URL generation
4. Update frontend to use pre-signed URLs
5. Migrate existing media handling

### Phase 2: Multiposting (Week 3-4)
1. Create unified multipost endpoint
2. Implement parallel execution
3. Create result aggregation
4. Update frontend Publish component
5. Add error handling per platform

### Phase 3: Scheduling (Week 5-6)
1. Set up Redis and Bull
2. Create job queue system
3. Implement Post and PlatformPost models
4. Create worker processes
5. Add scheduling UI
6. Implement cron jobs

### Phase 4: Retry & Monitoring (Week 7-8)
1. Implement retry logic
2. Add error categorization
3. Create monitoring dashboard
4. Set up alerts
5. Add job logging

---

## Security Considerations

### 1. Pre-Signed URLs
- ✅ Short expiry times (1h upload, 24h read)
- ✅ Content-Type validation
- ✅ File size limits
- ✅ User-specific paths (prevent access to others' files)
- ✅ CORS restrictions

### 2. Multiposting
- ✅ User authentication required
- ✅ Platform connection verification
- ✅ Rate limiting per user
- ✅ Content validation before posting

### 3. Scheduling
- ✅ User can only schedule their own posts
- ✅ Maximum schedule time limit (e.g., 1 year)
- ✅ Job data encryption in queue
- ✅ Audit logging for scheduled posts

---

## Performance Considerations

### 1. Scalability
- **Horizontal Scaling**: Multiple worker processes
- **Queue Partitioning**: Separate queues per platform (optional)
- **Database Indexing**: Index on userId, status, scheduledAt
- **Caching**: Cache platform tokens (Redis)

### 2. Optimization
- **Batch Processing**: Process multiple scheduled posts in batch
- **Connection Pooling**: Reuse HTTP connections to platforms
- **Async Processing**: Non-blocking job processing
- **Media Cleanup**: Automatic cleanup of old media files

### 3. Monitoring
- **Queue Depth**: Monitor job backlog
- **Processing Time**: Track average job duration
- **Error Rate**: Alert on high failure rates
- **Resource Usage**: Monitor CPU, memory, Redis usage

---

## Conclusion

This architecture provides:
- ✅ Secure media handling with pre-signed URLs
- ✅ Efficient multiposting to multiple platforms
- ✅ Reliable scheduling system with retry mechanism
- ✅ Scalable queue-based processing
- ✅ Comprehensive error handling
- ✅ Monitoring and observability

The system is designed to handle high volumes of posts while maintaining reliability and user experience.
