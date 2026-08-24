import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';

// Allowed MIME types and max size for production posters
export const ALLOWED_POSTER_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
];
export const MAX_POSTER_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

let s3ClientInstance: S3Client | null = null;

export const isCloudStorageConfigured = (): boolean => {
  return Boolean(
    ENV.S3_BUCKET_NAME &&
    ENV.S3_ACCESS_KEY_ID &&
    ENV.S3_SECRET_ACCESS_KEY
  );
};

export const getS3Client = (): S3Client => {
  if (!s3ClientInstance) {
    const clientConfig: any = {
      region: ENV.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: ENV.S3_ACCESS_KEY_ID || '',
        secretAccessKey: ENV.S3_SECRET_ACCESS_KEY || '',
      },
    };

    // If a custom S3 endpoint is defined (e.g. Cloudflare R2, MinIO, Supabase)
    if (ENV.S3_ENDPOINT) {
      clientConfig.endpoint = ENV.S3_ENDPOINT;
      clientConfig.forcePathStyle = true;
    }

    s3ClientInstance = new S3Client(clientConfig);
  }
  return s3ClientInstance;
};

export interface PresignedUploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface PresignedUploadResponse {
  storageType: 'S3' | 'LOCAL';
  uploadUrl: string;
  fileUrl: string;
  fileKey: string;
  headers?: Record<string, string>;
  expiresInSeconds?: number;
}

/**
 * Generates a presigned PUT URL for direct client-to-cloud upload,
 * or returns a local fallback endpoint if cloud storage credentials are not yet set in .env.
 */
export const generatePosterUploadUrl = async (
  req: PresignedUploadRequest
): Promise<PresignedUploadResponse> => {
  const { fileName, fileType, fileSize } = req;

  // 1. Validate file size
  if (fileSize > MAX_POSTER_SIZE_BYTES) {
    throw {
      statusCode: 400,
      message: `File size exceeds the 5MB maximum limit (${(fileSize / (1024 * 1024)).toFixed(2)}MB provided).`,
    };
  }

  // 2. Validate MIME type
  const normalizedMime = fileType.toLowerCase();
  if (!ALLOWED_POSTER_MIME_TYPES.includes(normalizedMime)) {
    throw {
      statusCode: 400,
      message: `Unsupported file format '${fileType}'. Allowed formats: JPEG, PNG, WebP, AVIF.`,
    };
  }

  // 3. Sanitize and generate unique storage key
  const ext = path.extname(fileName).toLowerCase() || (normalizedMime === 'image/png' ? '.png' : normalizedMime === 'image/webp' ? '.webp' : '.jpg');
  const safeName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 30);
  const fileKey = `posters/${Date.now()}-${randomUUID()}-${safeName}${ext}`;

  // 4. If Cloud Storage is configured, issue presigned S3 URL
  if (isCloudStorageConfigured()) {
    const s3 = getS3Client();
    const expiresInSeconds = 300; // 5 minutes

    const command = new PutObjectCommand({
      Bucket: ENV.S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: normalizedMime,
      // Cache-Control header for optimal CDN distribution (1 year immutable)
      CacheControl: 'public, max-age=31536000, immutable',
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });

    // Derive public file URL (CDN domain or standard S3 bucket URL)
    let fileUrl: string;
    if (ENV.CDN_URL) {
      fileUrl = `${ENV.CDN_URL.replace(/\/$/, '')}/${fileKey}`;
    } else if (ENV.S3_ENDPOINT) {
      // Cloudflare R2 / Custom S3
      fileUrl = `${ENV.S3_ENDPOINT.replace(/\/$/, '')}/${ENV.S3_BUCKET_NAME}/${fileKey}`;
    } else {
      // Standard AWS S3
      fileUrl = `https://${ENV.S3_BUCKET_NAME}.s3.${ENV.S3_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`;
    }

    return {
      storageType: 'S3',
      uploadUrl,
      fileUrl,
      fileKey,
      headers: {
        'Content-Type': normalizedMime,
      },
      expiresInSeconds,
    };
  }

  // 5. Dev Fallback: Local upload route
  return {
    storageType: 'LOCAL',
    uploadUrl: '/api/organiser/upload/local',
    fileUrl: '', // Computed after local upload
    fileKey,
  };
};

/**
 * Server-side upload directly to S3 / Cloudflare R2 or local disk fallback
 */
export const uploadBufferToCloudStorage = async (
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> => {
  const ext = path.extname(fileName).toLowerCase() || '.jpg';
  const safeName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 30);
  const fileKey = `posters/${Date.now()}-${randomUUID()}-${safeName}${ext}`;

  if (isCloudStorageConfigured()) {
    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: ENV.S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: mimeType,
      Body: buffer,
    });
    await s3.send(command);

    if (ENV.CDN_URL) {
      return `${ENV.CDN_URL.replace(/\/$/, '')}/${fileKey}`;
    } else if (ENV.S3_ENDPOINT) {
      return `${ENV.S3_ENDPOINT.replace(/\/$/, '')}/${ENV.S3_BUCKET_NAME}/${fileKey}`;
    } else {
      return `https://${ENV.S3_BUCKET_NAME}.s3.${ENV.S3_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`;
    }
  }

  // Dev fallback: Write to uploads directory
  const uploadDir = path.join(process.cwd(), 'uploads', 'posters');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filename = `${Date.now()}-${randomUUID()}-${safeName}${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/uploads/posters/${filename}`;
};
