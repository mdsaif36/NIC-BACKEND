import fs from 'fs';
import path from 'path';
import { Request } from 'express';

// ─── Storage Service ───────────────────────────────────────────────────────────
// Abstraction layer for file storage. Currently uses local disk.
//
// To switch to AWS S3 later:
//   1. npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer-s3
//   2. Replace the LocalStorageProvider class with an S3Provider class.
//   3. Update StorageService.upload() to call S3Provider.upload().
//   4. Zero route changes needed — all routes call storageService.upload() etc.
//
// S3 bucket structure (future):
//   s3://nextincampus/resumes/{userId}/{filename}
//   s3://nextincampus/screenshots/{userId}/{filename}
// ──────────────────────────────────────────────────────────────────────────────

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  /** Local: absolute path on disk. S3: full S3 key. */
  path: string;
  /** URL or path the client can use to request the file. */
  url: string;
}

export interface DownloadResult {
  /** Absolute local path or a presigned S3 URL. */
  url: string;
  /** Whether the result is a redirect URL (true for S3 presigned) or a local path. */
  isRedirect: boolean;
}

// ─── Local Storage Provider ────────────────────────────────────────────────────

class LocalStorageProvider {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getUserDir(userId: string | number): string {
    const dir = path.join(this.baseDir, String(userId));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  /**
   * Move/save an already-multer-processed file (multer.memoryStorage or diskStorage).
   * Returns a structured UploadedFile descriptor.
   */
  saveFile(userId: string | number, filename: string, buffer: Buffer): UploadedFile {
    const dir = this.getUserDir(userId);
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    return {
      fieldname: 'file',
      originalname: filename,
      mimetype: 'application/octet-stream',
      size: buffer.length,
      path: filePath,
      // Serve via GET /api/users/files/:userId/:filename
      url: `/api/users/files/${userId}/${encodeURIComponent(filename)}`,
    };
  }

  /**
   * Return download info for a stored file.
   */
  getFileUrl(userId: string | number, filename: string): DownloadResult {
    const filePath = path.join(this.baseDir, String(userId), filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }
    return {
      url: filePath,       // actual disk path — served by express.static or stream
      isRedirect: false,
    };
  }

  deleteFile(userId: string | number, filename: string): void {
    const filePath = path.join(this.baseDir, String(userId), filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  listFiles(userId: string | number): string[] {
    const dir = path.join(this.baseDir, String(userId));
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  }
}

// ─── Storage Service Facade ────────────────────────────────────────────────────

class StorageService {
  readonly resumes: LocalStorageProvider;
  readonly screenshots: LocalStorageProvider;

  constructor() {
    const cwd = process.cwd();
    this.resumes = new LocalStorageProvider(path.join(cwd, 'uploads', 'resumes'));
    this.screenshots = new LocalStorageProvider(path.join(cwd, 'uploads', 'screenshots'));
  }

  /**
   * Get the base upload directory path for use with multer diskStorage.
   * Keeps multer configuration compatible with storageService.
   */
  getResumeDir(userId: string | number): string {
    return this.resumes.getUserDir(userId);
  }

  getScreenshotDir(userId: string | number): string {
    return this.screenshots.getUserDir(userId);
  }

  /**
   * Derive the public URL for a resume file.
   * When switching to S3, this returns a presigned URL instead.
   */
  getResumeUrl(userId: string | number, filename: string): string {
    return `/api/users/files/resumes/${userId}/${encodeURIComponent(filename)}`;
  }

  getScreenshotUrl(userId: string | number, filename: string): string {
    return `/api/users/files/screenshots/${userId}/${encodeURIComponent(filename)}`;
  }

  /**
   * Read a resume file buffer from disk.
   * When switching to S3, this calls S3 GetObject instead.
   */
  readResumeBuffer(userId: string | number, filename: string): Buffer {
    const filePath = path.join(this.resumes.getUserDir(userId), filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Resume file not found: ${filename}`);
    }
    return fs.readFileSync(filePath);
  }

  readResumeAsStream(userId: string | number, filename: string): fs.ReadStream {
    const filePath = path.join(process.cwd(), 'uploads', 'resumes', String(userId), filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }
    return fs.createReadStream(filePath);
  }

  deleteResume(userId: string | number, filename: string): void {
    this.resumes.deleteFile(userId, filename);
  }

  deleteScreenshot(userId: string | number, filename: string): void {
    this.screenshots.deleteFile(userId, filename);
  }
}

// Singleton — import this across all route files
export const storageService = new StorageService();
