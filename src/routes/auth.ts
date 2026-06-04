import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { authenticate, AuthRequest, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// Sign Up Route
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role, name, college, company, jobTitle } = req.body;

    if (!email || !password || !role || !name || !college) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default stats/settings based on role
    const referralsSentCount = role === 'alumni' ? 0 : undefined;
    const availability = role === 'alumni' ? 'Available Now' : undefined;
    const responseRate = role === 'alumni' ? '92%' : undefined;
    const responseSpeed = role === 'alumni' ? 'Within 1 day' : undefined;
    const successRate = role === 'alumni' ? '0 referred' : undefined;

    // Create User
    const user = await User.create({
      email,
      password: hashedPassword,
      role,
      name,
      college,
      company: role === 'alumni' ? company : undefined,
      jobTitle: role === 'alumni' ? jobTitle : undefined,
      referralsSentCount,
      availability,
      responseRate,
      responseSpeed,
      successRate,
      skills: role === 'seeker' ? ['Python', 'React', 'DSA'] : [],
      skillDetails: role === 'seeker' ? {
        'Python': { proficiency: 4, type: 'technical' },
        'React': { proficiency: 3, type: 'technical' },
        'DSA': { proficiency: 4, type: 'domain' }
      } : {},
      targetCompanies: role === 'seeker' ? ['Google', 'Microsoft'] : [],
      resumeName: role === 'seeker' ? `${name.toLowerCase().replace(/\s+/g, '_')}_cv.pdf` : undefined,
      resumeUploaded: role === 'seeker' ? true : false,
      bio: role === 'seeker' ? 'Candidate seeking referral opportunities.' : 'Alumni mentor eager to refer top talent.'
    });

    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        college: user.college,
        company: user.company,
        jobTitle: user.jobTitle
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error during signup.', error: error.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Check role matches
    if (user.role !== role) {
      return res.status(400).json({ message: `No user found with the role of '${role}' matching this email.` });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        college: user.college,
        company: user.company,
        jobTitle: user.jobTitle
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

// Get Current User Session Route
router.get('/me', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Do not send password back
    const user = req.user.toJSON();
    delete (user as any).password;
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error loading profile.', error: error.message });
  }
});

export default router;
