import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// ─── Supabase / AWS S3 Storage Provider ────────────────────────────────────────

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
}

class S3Provider {
  private s3Client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
    this.bucket = process.env.AWS_S3_BUCKET || 'resumes';
    
    // The endpoint is required for Supabase to act like AWS S3
    const endpoint = process.env.AWS_ENDPOINT || 'https://your-project.supabase.co/storage/v1/s3';

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      endpoint: endpoint,
      forcePathStyle: true, // Must be true for Supabase S3 API
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  // Uploads a file buffer directly to the S3 bucket
  async saveFile(userId: string | number, filename: string, buffer: Buffer): Promise<UploadedFile> {
    const key = `${this.prefix}/${userId}/${Date.now()}-${filename}`;
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/octet-stream'
    }));

    const endpoint = process.env.AWS_ENDPOINT || 'https://your-project.supabase.co/storage/v1/s3';
    const publicBaseUrl = endpoint.replace('/storage/v1/s3', '/storage/v1/object/public');
    const publicUrl = `${publicBaseUrl}/${this.bucket}/${key}`;

    return {
      fieldname: 'file',
      originalname: filename,
      mimetype: 'application/octet-stream',
      size: buffer.length,
      path: key,
      url: publicUrl
    };
  }

  // Deletes a file from the S3 bucket
  async deleteFile(userId: string | number, filename: string): Promise<void> {
    let key = '';
    if (filename.startsWith('http')) {
      const parts = filename.split(`/${this.prefix}/`);
      if (parts.length > 1) {
        key = `${this.prefix}/${parts[1]}`;
      } else {
        key = filename;
      }
    } else {
      key = `${this.prefix}/${userId}/${filename}`;
    }

    try {
      await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      console.error('S3 Delete Error:', error);
    }
  }

  // Fetches a file from S3 as a buffer
  async getFileBuffer(userId: string | number, filename: string): Promise<Buffer> {
    let key = '';
    if (filename.startsWith('http')) {
      const parts = filename.split(`/${this.prefix}/`);
      if (parts.length > 1) {
        key = `${this.prefix}/${parts[1]}`;
      } else {
        key = filename;
      }
    } else {
      key = `${this.prefix}/${userId}/${filename}`;
    }

    const response = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    
    if (!response.Body) throw new Error(`File not found in S3: ${key}`);
    
    const stream = response.Body as Readable;
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
      stream.on('error', err => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  // Fetches a file from S3 as a stream (for fast downloads)
  async getFileStream(userId: string | number, filename: string): Promise<Readable> {
    let key = '';
    if (filename.startsWith('http')) {
      const parts = filename.split(`/${this.prefix}/`);
      if (parts.length > 1) {
        key = `${this.prefix}/${parts[1]}`;
      } else {
        key = filename;
      }
    } else {
      key = `${this.prefix}/${userId}/${filename}`;
    }

    const response = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return response.Body as Readable;
  }
}

// ─── Storage Service Facade ────────────────────────────────────────────────────

class StorageService {
  readonly resumes: S3Provider;
  readonly screenshots: S3Provider;

  constructor() {
    this.resumes = new S3Provider('resumes');
    this.screenshots = new S3Provider('screenshots');
  }

  getResumeUrl(userId: string | number, filename: string): string {
    if (filename.startsWith('http')) return filename;
    const endpoint = process.env.AWS_ENDPOINT || 'https://your-project.supabase.co/storage/v1/s3';
    const publicBaseUrl = endpoint.replace('/storage/v1/s3', '/storage/v1/object/public');
    const bucket = process.env.AWS_S3_BUCKET || 'resumes';
    return `${publicBaseUrl}/${bucket}/resumes/${userId}/${encodeURIComponent(filename)}`;
  }

  getScreenshotUrl(userId: string | number, filename: string): string {
    if (filename.startsWith('http')) return filename;
    const endpoint = process.env.AWS_ENDPOINT || 'https://your-project.supabase.co/storage/v1/s3';
    const publicBaseUrl = endpoint.replace('/storage/v1/s3', '/storage/v1/object/public');
    const bucket = process.env.AWS_S3_BUCKET || 'resumes';
    return `${publicBaseUrl}/${bucket}/screenshots/${userId}/${encodeURIComponent(filename)}`;
  }

  async readResumeBuffer(userId: string | number, filename: string): Promise<Buffer> {
    return this.resumes.getFileBuffer(userId, filename);
  }

  async readResumeAsStream(userId: string | number, filename: string): Promise<Readable> {
    return this.resumes.getFileStream(userId, filename);
  }

  async deleteResume(userId: string | number, filename: string): Promise<void> {
    return this.resumes.deleteFile(userId, filename);
  }

  async deleteScreenshot(userId: string | number, filename: string): Promise<void> {
    return this.screenshots.deleteFile(userId, filename);
  }
}

export const storageService = new StorageService();
