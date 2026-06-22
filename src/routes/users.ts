import { Router, Response } from 'express';
import { User } from '../models/User.js';
import { UserActivity } from '../models/UserActivity.js';
import { ReferralRequest } from '../models/ReferralRequest.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { extractTextFromPdf, parseProfileWithLLM, generateCareerIntelligence } from '../utils/aiParser.js';
import { calculateMatch } from '../utils/aiRecommender.js';

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

const screenshotUploadDir = path.join(process.cwd(), 'uploads', 'screenshots');

const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const user = (req as any).user;
    const userDir = path.join(screenshotUploadDir, String(user.id));
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `screenshot_${Date.now()}${ext}`);
  }
});

const screenshotUpload = multer({
  storage: screenshotStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.pdf') {
      return cb(new Error('Only PNG, JPG, JPEG, and PDF files are allowed.'));
    }
    cb(null, true);
  }
});

const router = Router();

// Get Alumni list
router.get('/alumni', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // Find all users with role 'alumni'
    const alumniList = await User.findAll({
      where: { role: 'alumni' },
      attributes: { exclude: ['password'] }, // Keep email to filter dynamically
    });

    if (user && user.role === 'seeker') {
      // Calculate dynamic match score and reasons for each alumni
      const enrichedAlumniList = await Promise.all(
        alumniList.map(async (alumni) => {
          const { score, reasons } = await calculateMatch(user, alumni);
          const alumniJSON = alumni.toJSON();
          
          // Apply privacy filters
          if (alumniJSON.isPrivateProfile) {
            alumniJSON.email = null;
            alumniJSON.companyEmail = null;
            alumniJSON.linkedinUrl = null;
            alumniJSON.githubUrl = null;
            alumniJSON.phone = null;
          } else {
            if (alumniJSON.hideEmail) alumniJSON.email = null;
            if (alumniJSON.hideCompanyEmail) alumniJSON.companyEmail = null;
            if (alumniJSON.hideLinkedIn) alumniJSON.linkedinUrl = null;
            if (alumniJSON.hidePhone) alumniJSON.phone = null;
          }

          return {
            ...alumniJSON,
            match: score,
            matchReasons: reasons
          };
        })
      );
      return res.json(enrichedAlumniList);
    }

    const filteredAlumni = alumniList.map(alumni => {
      const alumniJSON = alumni.toJSON();
      if (alumniJSON.isPrivateProfile) {
        alumniJSON.email = null;
        alumniJSON.companyEmail = null;
        alumniJSON.linkedinUrl = null;
        alumniJSON.githubUrl = null;
        alumniJSON.phone = null;
      } else {
        if (alumniJSON.hideEmail) alumniJSON.email = null;
        if (alumniJSON.hideCompanyEmail) alumniJSON.companyEmail = null;
        if (alumniJSON.hideLinkedIn) alumniJSON.linkedinUrl = null;
        if (alumniJSON.hidePhone) alumniJSON.phone = null;
      }
      return alumniJSON;
    });
    res.json(filteredAlumni);
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
      targetRole,
      resumeUploaded,
      resumeName,
      resumesHistory,
      availability,
      company,
      jobTitle,
      projects,
      canHelpWith,
      experience,
      successStories,
      phone,
      isPrivateProfile,
      hideEmail,
      hidePhone,
      hideLinkedIn,
      hideCompanyEmail
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
    if (targetRole !== undefined) user.targetRole = targetRole;
    if (resumeUploaded !== undefined) user.resumeUploaded = resumeUploaded;
    if (resumeName !== undefined) user.resumeName = resumeName;
    if (resumesHistory !== undefined) user.resumesHistory = resumesHistory;

    // Alumni specific fields
    if (availability !== undefined) user.availability = availability;
    if (company !== undefined) user.company = company;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
    if (projects !== undefined) user.projects = projects;
    if (canHelpWith !== undefined) user.canHelpWith = canHelpWith;
    if (experience !== undefined) user.experience = experience;
    if (successStories !== undefined) user.successStories = successStories;
    if (phone !== undefined) user.phone = phone;
    if (isPrivateProfile !== undefined) user.isPrivateProfile = isPrivateProfile;
    if (hideEmail !== undefined) user.hideEmail = hideEmail;
    if (hidePhone !== undefined) user.hidePhone = hidePhone;
    if (hideLinkedIn !== undefined) user.hideLinkedIn = hideLinkedIn;
    if (hideCompanyEmail !== undefined) user.hideCompanyEmail = hideCompanyEmail;

    // Regenerate career intelligence if profile details or active resume changed
    if (
      skills !== undefined ||
      projects !== undefined ||
      targetRole !== undefined ||
      targetCompanies !== undefined ||
      resumeName !== undefined ||
      resumeUploaded !== undefined
    ) {
      const skillsToUse = skills !== undefined ? skills : user.skills || [];
      const projectsToUse = projects !== undefined ? projects : user.projects || [];
      const roleToUse = targetRole !== undefined ? targetRole : user.targetRole || "Software Engineer";
      const companiesToUse = targetCompanies !== undefined ? targetCompanies : user.targetCompanies || [];
      const resumeNameToUse = resumeName !== undefined ? resumeName : user.resumeName;
      const isUploadedToUse = resumeUploaded !== undefined ? resumeUploaded : user.resumeUploaded;
      
      let resumeText = "";
      if (isUploadedToUse && resumeNameToUse) {
        try {
          const filePath = path.join(uploadDir, String(user.id), resumeNameToUse);
          if (fs.existsSync(filePath) && path.extname(resumeNameToUse).toLowerCase() === '.pdf') {
            const buffer = fs.readFileSync(filePath);
            resumeText = await extractTextFromPdf(buffer);
          }
        } catch (readErr) {
          console.error("Failed to read existing resume for regeneration:", readErr);
        }
      }

      try {
        const report = await generateCareerIntelligence(resumeText, skillsToUse, projectsToUse, roleToUse, companiesToUse);
        user.careerIntelligence = report;
      } catch (err) {
        console.error("Failed to regenerate career intelligence:", err);
      }
    }

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

    // AI Resume Parsing & Profile Extraction
    const ext = path.extname(name).toLowerCase();
    if (ext === '.pdf') {
      try {
        const filePath = path.join(uploadDir, String(user.id), name);
        const buffer = fs.readFileSync(filePath);
        const extractedText = await extractTextFromPdf(buffer);
        const parsedProfile = await parseProfileWithLLM(extractedText);
        
        if (parsedProfile.skills && parsedProfile.skills.length > 0) {
          user.skills = parsedProfile.skills;
        }
        if (parsedProfile.targetRole) {
          user.targetRole = parsedProfile.targetRole;
        }
        if (parsedProfile.targetCompanies && parsedProfile.targetCompanies.length > 0) {
          user.targetCompanies = parsedProfile.targetCompanies;
        }
        if (parsedProfile.bio) {
          user.bio = parsedProfile.bio;
        }

        // Generate AI Career Intelligence Report
        const skillsToUse = parsedProfile.skills || [];
        const projectsToUse = user.projects || [];
        const roleToUse = parsedProfile.targetRole || "Software Engineer";
        const companiesToUse = parsedProfile.targetCompanies || [];
        
        try {
          const report = await generateCareerIntelligence(extractedText, skillsToUse, projectsToUse, roleToUse, companiesToUse);
          user.careerIntelligence = report;
        } catch (reportErr) {
          console.error("[AI Parser] Failed to generate career intelligence report:", reportErr);
        }
      } catch (parseErr: any) {
        console.error("[AI Parser] Failed to parse resume PDF:", parseErr);
      }
    } else {
      console.log("[AI Parser] Skipping parse: AI parser only supports PDF resumes currently.");
    }

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
    
    // Security check: prevent directory traversal by validating userId and filename
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId) || parsedUserId <= 0 || String(parsedUserId) !== userId) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    const cleanFilename = path.basename(filename);
    const filePath = path.join(uploadDir, String(parsedUserId), cleanFilename);
    
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

// Get User Activity Log
router.get('/activity/:userId', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const activities = await UserActivity.findAll({
      where: { userId },
      attributes: ['date', 'count'],
      order: [['date', 'ASC']]
    });
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving user activity.', error: error.message });
  }
});

// --- ALUMNI VERIFICATION ENDPOINTS ---

// 1. Request OTP to company email
router.post('/verify/email-request', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const { companyEmail } = req.body;
    if (!companyEmail) {
      return res.status(400).json({ message: 'Company email is required.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user.companyEmail = companyEmail;
    user.companyEmailOtp = otp;
    user.companyEmailOtpExpires = expires;
    await user.save();

    console.log(`[VERIFICATION OTP] Email: ${companyEmail} | OTP: ${otp}`);

    res.json({
      message: 'OTP sent successfully to company email.',
      otp: otp // Send back for easy local simulation
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error sending OTP.', error: error.message });
  }
});

// 2. Confirm OTP
router.post('/verify/email-confirm', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required.' });
    }

    if (!user.companyEmailOtp || !user.companyEmailOtpExpires) {
      return res.status(400).json({ message: 'No active OTP verification session.' });
    }

    if (new Date() > new Date(user.companyEmailOtpExpires)) {
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    if (user.companyEmailOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    user.isEmailVerified = true;
    user.companyEmailOtp = undefined;
    user.companyEmailOtpExpires = undefined;
    await user.save();

    res.json({
      message: 'Company email verified successfully!',
      user: {
        id: user.id,
        isEmailVerified: user.isEmailVerified,
        companyEmail: user.companyEmail,
        verificationLevel: user.verificationLevel,
        trustScore: user.trustScore
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error confirming OTP.', error: error.message });
  }
});

// 3. Simulated LinkedIn Verification
router.post('/verify/linkedin', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const { linkedinUrl } = req.body;
    if (!linkedinUrl) {
      return res.status(400).json({ message: 'LinkedIn URL is required.' });
    }

    user.linkedinUrl = linkedinUrl;
    user.isLinkedinVerified = true;
    await user.save();

    res.json({
      message: 'LinkedIn profile verified successfully!',
      user: {
        id: user.id,
        linkedinUrl: user.linkedinUrl,
        isLinkedinVerified: user.isLinkedinVerified,
        verificationLevel: user.verificationLevel,
        trustScore: user.trustScore
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error verifying LinkedIn.', error: error.message });
  }
});

// 4. Employee ID / Screenshot Upload
router.post('/verify/manual-upload', authenticate as any, screenshotUpload.single('screenshot'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!req.file) {
      return res.status(400).json({ message: 'No screenshot file uploaded.' });
    }

    user.employeeScreenshot = req.file.filename;
    user.isAdminVerified = false; // Reset to false until approved by admin
    await user.save();

    res.json({
      message: 'Employee ID uploaded successfully! Pending admin approval.',
      employeeScreenshot: user.employeeScreenshot,
      isAdminVerified: user.isAdminVerified,
      verificationLevel: user.verificationLevel,
      trustScore: user.trustScore
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error uploading manual ID.', error: error.message });
  }
});

// 5. Get pending admin reviews list
router.get('/verify/admin-list', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const pending = await User.findAll({
      where: {
        role: 'alumni',
        isAdminVerified: false,
        employeeScreenshot: {
          [Op.ne]: null
        }
      },
      attributes: [
        'id', 'name', 'email', 'companyEmail', 'company', 
        'jobTitle', 'linkedinUrl', 'employeeScreenshot', 
        'isEmailVerified', 'isLinkedinVerified', 'verificationLevel', 'trustScore'
      ]
    });
    res.json(pending);
  } catch (error: any) {
    res.status(500).json({ message: 'Error listing pending reviews.', error: error.message });
  }
});

// 6. Admin Approve Verification
router.post('/verify/admin-approve/:userId', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    targetUser.isAdminVerified = true;
    targetUser.verifiedAt = new Date();
    await targetUser.save();

    res.json({
      message: `User ${targetUser.name} successfully approved!`,
      user: {
        id: targetUser.id,
        isAdminVerified: targetUser.isAdminVerified,
        verificationLevel: targetUser.verificationLevel,
        trustScore: targetUser.trustScore
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error approving user.', error: error.message });
  }
});

// 7. Admin Reject Verification
router.post('/verify/admin-reject/:userId', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Delete file if exists to clean up
    if (targetUser.employeeScreenshot) {
      const filePath = path.join(screenshotUploadDir, String(targetUser.id), targetUser.employeeScreenshot);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    targetUser.employeeScreenshot = null as any;
    targetUser.isAdminVerified = false;
    await targetUser.save();

    res.json({
      message: `User ${targetUser.name} verification request rejected.`,
      user: {
        id: targetUser.id,
        isAdminVerified: targetUser.isAdminVerified,
        verificationLevel: targetUser.verificationLevel,
        trustScore: targetUser.trustScore
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error rejecting user.', error: error.message });
  }
});

// 8. Serve Manual ID Screenshots
router.get('/verify/screenshot/:userId', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findByPk(userId);
    if (!targetUser || !targetUser.employeeScreenshot) {
      return res.status(404).json({ message: 'Screenshot not found.' });
    }

    const filePath = path.join(screenshotUploadDir, String(targetUser.id), targetUser.employeeScreenshot);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Screenshot file not found.' });
    }

    res.sendFile(filePath);
  } catch (error: any) {
    res.status(500).json({ message: 'Error downloading screenshot.', error: error.message });
  }
});

/**
 * @swagger
 * /api/users/leaderboard:
 *   get:
 *     summary: Retrieve the alumni leaderboard sorted by Impact Score
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leaderboard data retrieved successfully
 */
router.get('/leaderboard', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.user;
    
    // Find all alumni
    const alumniList = await User.findAll({
      where: { role: 'alumni' },
      attributes: ['id', 'name', 'company', 'jobTitle', 'referralsSentCount']
    });

    const leaderboard = await Promise.all(alumniList.map(async (alumni) => {
      // 1. Referrals Count
      const referralsCount = await ReferralRequest.count({
        where: { alumniId: alumni.id, status: 'referred' }
      });

      // 2. Offers Count
      const hiredCount = await ReferralRequest.count({
        where: { alumniId: alumni.id, status: 'hired' }
      });

      // 3. Avg Rating
      const ratingStats = await ReferralRequest.findAll({
        where: { alumniId: alumni.id, rating: { [Op.ne]: null } },
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
        raw: true
      }) as any[];
      const averageRatingRaw = ratingStats[0]?.avgRating;
      const averageRating = averageRatingRaw ? Math.round(Number(averageRatingRaw) * 100) / 100 : 5.0;

      // 4. Response Rate
      const totalRequests = await ReferralRequest.count({
        where: { alumniId: alumni.id }
      });
      const answeredRequests = await ReferralRequest.count({
        where: { alumniId: alumni.id, status: { [Op.ne]: 'pending' } }
      });
      const responseRate = totalRequests > 0 ? Math.round((answeredRequests / totalRequests) * 100) : 100;

      // 5. Meetings/Activity (accepted, referred, hired requests)
      const meetingsCount = await ReferralRequest.count({
        where: { alumniId: alumni.id, status: ['accepted', 'referred', 'hired'] }
      });

      // Calculate Impact Score (out of 1000)
      const referralPoints = Math.min(350, referralsCount * 30);
      const offerPoints = Math.min(200, hiredCount * 45);
      const ratingPoints = Math.round((averageRating / 5) * 200);
      const responsePoints = Math.round((responseRate / 100) * 150);
      const activityPoints = Math.min(100, meetingsCount * 10);
      
      const impactScore = referralPoints + offerPoints + ratingPoints + responsePoints + activityPoints;

      // Determine Mentor Tier
      let level: 'Rising Mentor' | 'Trusted Mentor' | 'Career Guide' | 'Elite Mentor' | 'Hall of Fame' = 'Rising Mentor';
      if (impactScore >= 800) level = 'Hall of Fame';
      else if (impactScore >= 500) level = 'Elite Mentor';
      else if (impactScore >= 300) level = 'Career Guide';
      else if (impactScore >= 150) level = 'Trusted Mentor';

      // Assign Badges
      const badges: string[] = [];
      if (referralsCount >= 5) badges.push('🥇 Referral Champion');
      if (meetingsCount >= 5) badges.push('🥈 Career Mentor');
      if (impactScore >= 600) badges.push('🥉 Top Contributor');
      if (impactScore >= 150 && impactScore < 300) badges.push('⭐ Rising Mentor');
      if (responseRate >= 95) badges.push('🚀 Fast Responder');
      if (averageRating >= 4.8 && totalRequests >= 3) badges.push('❤️ Most Helpful');
      if (hiredCount >= 2) badges.push('🎯 Impact Leader');

      if (badges.length === 0) {
        badges.push('🌱 New Mentor');
      }

      // Name initials
      const initials = alumni.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      
      const colors = [
        'from-amber-500 to-orange-500',
        'from-violet-500 to-purple-600',
        'from-blue-500 to-cyan-500',
        'from-rose-500 to-pink-500',
        'from-teal-500 to-emerald-500',
        'from-orange-500 to-red-500',
        'from-indigo-500 to-blue-500',
        'from-cyan-500 to-sky-500',
        'from-purple-500 to-violet-500',
        'from-amber-600 to-yellow-500'
      ];
      const gradient = colors[alumni.id % colors.length];

      return {
        id: alumni.id,
        name: alumni.name,
        company: alumni.company || 'NextInCampus',
        role: alumni.jobTitle || 'Alumni Mentor',
        initials,
        impactScore,
        level,
        badges,
        referrals: referralsCount,
        interviews: referralsCount, // Map interview count to referrals for demo
        offers: hiredCount,
        rating: averageRating,
        responseTime: responseRate >= 90 ? '30 min' : '2 hrs',
        responseRate,
        meetingsConducted: meetingsCount,
        monthlyPoints: impactScore,
        allTimePoints: impactScore + 500, // Add simulated past points for all-time
        gradient,
        trendUp: true as boolean | null,
        rankChange: 0
      };
    }));

    // Sort by impact score descending
    leaderboard.sort((a, b) => b.impactScore - a.impactScore);

    // Apply ranking changes trend simulation
    leaderboard.forEach((item, index) => {
      item.rankChange = index % 3 === 0 ? 1 : index % 3 === 1 ? -1 : 0;
      item.trendUp = item.rankChange > 0 ? true : item.rankChange < 0 ? false : null;
    });

    let myRankData = null;
    if (currentUser && currentUser.role === 'alumni') {
      myRankData = leaderboard.find(a => a.id === currentUser.id);
      if (!myRankData) {
        // Create a simulated rank if current user is not fully loaded
        const initials = currentUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        myRankData = {
          id: currentUser.id,
          name: currentUser.name,
          company: currentUser.company || 'Your Company',
          role: currentUser.jobTitle || 'Alumni Mentor',
          initials,
          impactScore: 120,
          level: 'Rising Mentor',
          badges: ['🌱 New Mentor'],
          referrals: 0,
          interviews: 0,
          offers: 0,
          rating: 5.0,
          responseTime: '1 hr',
          responseRate: 100,
          meetingsConducted: 0,
          monthlyPoints: 120,
          allTimePoints: 120,
          gradient: 'from-emerald-500 to-teal-500',
          trendUp: null,
          rankChange: 0
        };
      }
    }

    res.json({
      leaderboard,
      myRank: myRankData
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving leaderboard.', error: error.message });
  }
});

export default router;
