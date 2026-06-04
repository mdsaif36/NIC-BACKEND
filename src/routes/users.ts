import { Router, Response } from 'express';
import { User } from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

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

export default router;
