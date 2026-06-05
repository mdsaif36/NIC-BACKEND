import { Router, Response } from 'express';
import { User } from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const user = (req as any).user;
    const userDir = path.join(uploadDir, String(user.id));
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' && ext !== '.docx' && ext !== '.doc') {
      return cb(new Error('Only PDF, DOCX, and DOC documents are allowed.'));
    }
    cb(null, true);
  }
});

const router = Router();

// Get Alumni list
router.get('/alumni', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    // Find all users with role 'alumni'
    const alumniList = await User.findAll({
      where: { role: 'alumni' },
      attributes: { exclude: ['password', 'email'] }, // Exclude sensitive info
    });

    res.json(alumniList);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving alumni list.', error: error.message });
  }
});

// Update Profile Route
router.put('/profile', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      name,
      college,
      year,
      branch,
      bio,
      githubUrl,
      linkedinUrl,
      skills,
      skillDetails,
      targetCompanies,
      resumeUploaded,
      resumeName,
      resumesHistory,
      availability,
      company,
      jobTitle
    } = req.body;

    // Update fields
    if (name !== undefined) user.name = name;
    if (college !== undefined) user.college = college;
    
    // Seeker specific fields
    if (year !== undefined) user.year = year;
    if (branch !== undefined) user.branch = branch;
    if (bio !== undefined) user.bio = bio;
    if (githubUrl !== undefined) user.githubUrl = githubUrl;
    if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl;
    if (skills !== undefined) user.skills = skills;
    if (skillDetails !== undefined) user.skillDetails = skillDetails;
    if (targetCompanies !== undefined) user.targetCompanies = targetCompanies;
    if (resumeUploaded !== undefined) user.resumeUploaded = resumeUploaded;
    if (resumeName !== undefined) user.resumeName = resumeName;
    if (resumesHistory !== undefined) user.resumesHistory = resumesHistory;

    // Alumni specific fields
    if (availability !== undefined) user.availability = availability;
    if (company !== undefined) user.company = company;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;

    await user.save();

    const responseUser = user.toJSON();
    delete (responseUser as any).password;

    res.json(responseUser);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating profile.', error: error.message });
  }
});

// Upload Seeker Resume Route
router.post('/resume/upload', authenticate as any, upload.single('resume'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can upload resumes.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const name = req.file.originalname;
    const rawSize = req.file.size;
    let sizeStr = '0 KB';
    if (rawSize >= 1024 * 1024) {
      sizeStr = `${(rawSize / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      sizeStr = `${(rawSize / 1024).toFixed(0)} KB`;
    }

    const timeStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newItem = {
      id: `res-${Date.now()}`,
      name,
      size: sizeStr,
      uploadedAt: timeStr
    };

    // Load existing history and update
    let history = user.resumesHistory || [];
    // Filter out duplicate by name
    history = [newItem, ...history.filter((item: any) => item.name !== name)];
    user.resumesHistory = history;
    user.resumeName = name;
    user.resumeUploaded = true;

    await user.save();

    const responseUser = user.toJSON();
    delete (responseUser as any).password;
    res.json(responseUser);
  } catch (error: any) {
    res.status(500).json({ message: 'Error uploading resume.', error: error.message });
  }
});

// Download Seeker Resume Route
router.get('/resume/download/:userId/:filename', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, filename } = req.params;
    
    // Security check: only allow base name to prevent directory traversal
    const cleanFilename = path.basename(filename);
    const filePath = path.join(uploadDir, String(userId), cleanFilename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Resume file not found.' });
    }

    // Set appropriate headers based on extension
    const ext = path.extname(cleanFilename).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (ext === '.docx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } else if (ext === '.doc') {
      res.setHeader('Content-Type', 'application/msword');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }

    // Allow inline viewing (not attachment) so it can be previewed in iframe
    res.setHeader('Content-Disposition', `inline; filename="${cleanFilename}"`);
    
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    res.status(500).json({ message: 'Error downloading resume.', error: error.message });
  }
});

export default router;
