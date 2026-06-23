import { Router, Response } from 'express';
import { Application } from '../models/Application.js';
import { ReferralPost } from '../models/ReferralPost.js';
import { User } from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { notifyUser } from '../utils/notificationService.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');

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
    cb(null, `${Date.now()}-${file.originalname}`);
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

// 1. Submit a new application (Seeker only)
router.post('/', authenticate as any, upload.single('resume'), async (req: AuthRequest, res: Response) => {
  try {
    const seeker = req.user!;
    if (seeker.role !== 'seeker') {
      return res.status(403).json({ message: 'Only job seekers can apply for referral posts.' });
    }

    const { postId, pitch, highlightProjectUrl } = req.body;
    if (!postId || !pitch) {
      return res.status(400).json({ message: 'postId and pitch are required.' });
    }

    const post = await ReferralPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: 'Referral post not found.' });
    }

    if (!post.isActive) {
      return res.status(400).json({ message: 'This referral post is no longer active.' });
    }

    // Check if already applied
    const existingApp = await Application.findOne({
      where: { postId, seekerId: seeker.id }
    });
    if (existingApp) {
      return res.status(400).json({ message: 'You have already applied for this referral post.' });
    }

    // Handle custom resume URL if uploaded
    let customResumeUrl: string | undefined = undefined;
    if (req.file) {
      customResumeUrl = `/api/users/files/resumes/${seeker.id}/${req.file.filename}`;
    }

    const application = await Application.create({
      postId,
      seekerId: seeker.id,
      pitch,
      highlightProjectUrl,
      customResumeUrl,
      status: 'Pending'
    });

    // Increment applyCount on the post
    post.applyCount = (post.applyCount || 0) + 1;
    await post.save();

    // Notify the alumnus who created the post
    await notifyUser(req.app, {
      userId: post.alumniId,
      type: 'referral_received',
      title: '📬 New Application Received',
      message: `${seeker.name} has applied for your referral post: ${post.role}.`,
      actionUrl: `?tab=my_referrals&subTab=posts`,
      metadata: { postId: post.id, seekerId: seeker.id, applicationId: application.id }
    });

    res.status(201).json(application);
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting application.', error: error.message });
  }
});

// 2. View applications for a specific post (Alumni owner only)
router.get('/post/:postId', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { postId } = req.params;

    const post = await ReferralPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: 'Referral post not found.' });
    }

    // Security check: only the alumni who posted can see applicants
    if (post.alumniId !== user.id) {
      return res.status(403).json({ message: 'Access denied. You can only view applicants for your own posts.' });
    }

    const applicants = await Application.findAll({
      where: { postId },
      include: [
        {
          model: User,
          as: 'seeker',
          attributes: ['id', 'name', 'email', 'college', 'year', 'branch', 'linkedinUrl', 'githubUrl', 'resumeName', 'resumeUploaded']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(applicants);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving applicants.', error: error.message });
  }
});

// 3. Update application status (Alumni owner only)
router.put('/:id/status', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Pending', 'Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid or missing status. Supported values are Pending, Accepted, Rejected.' });
    }

    const application = await Application.findByPk(id, {
      include: [{ model: ReferralPost, as: 'post' }]
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const post = (application as any).post;
    if (!post) {
      return res.status(404).json({ message: 'Associated referral post not found.' });
    }

    // Security check: only post owner can update application status
    if (post.alumniId !== user.id) {
      return res.status(403).json({ message: 'Access denied. You can only manage applications for your own posts.' });
    }

    application.status = status;
    await application.save();

    // Notify seeker about the update
    if (status === 'Accepted') {
      await notifyUser(req.app, {
        userId: application.seekerId,
        type: 'referral_accepted',
        title: '🎉 Application Accepted',
        message: `Your application for ${post.role} at ${post.company} has been accepted!`,
        actionUrl: '?tab=my_referrals',
        metadata: { postId: post.id, applicationId: application.id }
      });
    } else if (status === 'Rejected') {
      await notifyUser(req.app, {
        userId: application.seekerId,
        type: 'referral_declined',
        title: '❌ Application Update',
        message: `Your application for ${post.role} at ${post.company} was not accepted at this time.`,
        actionUrl: '?tab=my_referrals',
        metadata: { postId: post.id, applicationId: application.id }
      });
    }

    res.json(application);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating application status.', error: error.message });
  }
});

// 4. Get seeker's own applications
router.get('/my', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const seeker = req.user!;
    if (seeker.role !== 'seeker') {
      return res.status(403).json({ message: 'Only job seekers can view their applications.' });
    }

    const applications = await Application.findAll({
      where: { seekerId: seeker.id },
      include: [
        {
          model: ReferralPost,
          as: 'post',
          include: [
            {
              model: User,
              as: 'alumni',
              attributes: ['name', 'company', 'jobTitle']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(applications);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving your applications.', error: error.message });
  }
});

export default router;
