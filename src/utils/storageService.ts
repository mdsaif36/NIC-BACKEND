import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

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

  // Uploads a file buffer directly to the S3 bucket, with a local fallback for development
  async saveFile(userId: string | number, filename: string, buffer: Buffer): Promise<UploadedFile> {
    const key = `${this.prefix}/${userId}/${Date.now()}-${filename}`;
    
    // Check if credentials are placeholder values or missing
    const isPlaceholder = !process.env.AWS_ACCESS_KEY_ID || 
                          process.env.AWS_ACCESS_KEY_ID === 'your-anon-key' ||
                          !process.env.AWS_SECRET_ACCESS_KEY ||
                          process.env.AWS_SECRET_ACCESS_KEY === 'your-service-role-key';

    if (!isPlaceholder) {
      try {
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
      } catch (s3Error) {
        console.warn('[Storage] S3 Upload failed, falling back to local file storage:', s3Error);
      }
    }

    // --- Local Filesystem Fallback ---
    console.log('[Storage] Saving file to local storage directory...');
    const localDir = path.join(process.cwd(), 'uploads', this.prefix, String(userId));
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const uniqueFilename = `${Date.now()}-${filename}`;
    const filePath = path.join(localDir, uniqueFilename);
    fs.writeFileSync(filePath, buffer);

    // Return the relative local download endpoint
    const publicUrl = this.prefix === 'resumes'
      ? `/api/users/resume/download/${userId}/${uniqueFilename}`
      : `/api/users/verify/download/${userId}/${uniqueFilename}`;

    return {
      fieldname: 'file',
      originalname: filename,
      mimetype: 'application/octet-stream',
      size: buffer.length,
      path: uniqueFilename,
      url: publicUrl
    };
  }

  // Deletes a file from the S3 bucket or local disk
  async deleteFile(userId: string | number, filename: string): Promise<void> {
    const isLocal = !filename.startsWith('http') || filename.startsWith('/');
    if (!isLocal) {
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
        return;
      } catch (error) {
        console.error('S3 Delete Error:', error);
      }
    }

    // --- Local Delete Fallback ---
    try {
      const cleanFilename = path.basename(filename);
      const filePath = path.join(process.cwd(), 'uploads', this.prefix, String(userId), cleanFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (localErr) {
      console.error('Local File Delete Error:', localErr);
    }
  }

  // Fetches a file from S3 as a buffer, with a local fallback
  async getFileBuffer(userId: string | number, filename: string): Promise<Buffer> {
    const isLocal = !filename.startsWith('http') || filename.startsWith('/');
    if (!isLocal) {
      try {
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
        
        if (response.Body) {
          const stream = response.Body as Readable;
          return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
            stream.on('error', err => reject(err));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
          });
        }
      } catch (s3Error) {
        console.warn('[Storage] S3 read failed, checking local fallback storage:', s3Error);
      }
    }

    // --- Local Filesystem Fallback ---
    const cleanFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'uploads', this.prefix, String(userId), cleanFilename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    throw new Error(`File not found: ${filename}`);
  }

  // Fetches a file from S3 as a stream, with a local fallback
  async getFileStream(userId: string | number, filename: string): Promise<Readable> {
    const isLocal = !filename.startsWith('http') || filename.startsWith('/');
    if (!isLocal) {
      try {
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
        if (response.Body) {
          return response.Body as Readable;
        }
      } catch (s3Error) {
        console.warn('[Storage] S3 stream read failed, checking local fallback stream:', s3Error);
      }
    }

    // --- Local Filesystem Fallback ---
    const cleanFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'uploads', this.prefix, String(userId), cleanFilename);
    if (fs.existsSync(filePath)) {
      return fs.createReadStream(filePath) as any;
    }
    throw new Error(`File not found: ${filename}`);
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
    if (filename.startsWith('http') || filename.startsWith('/')) return filename;
    const endpoint = process.env.AWS_ENDPOINT || 'https://your-project.supabase.co/storage/v1/s3';
    const publicBaseUrl = endpoint.replace('/storage/v1/s3', '/storage/v1/object/public');
    const bucket = process.env.AWS_S3_BUCKET || 'resumes';
    return `${publicBaseUrl}/${bucket}/resumes/${userId}/${encodeURIComponent(filename)}`;
  }

  getScreenshotUrl(userId: string | number, filename: string): string {
    if (filename.startsWith('http') || filename.startsWith('/')) return filename;
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
