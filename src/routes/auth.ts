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
    if (!user.password) {
      return res.status(400).json({ message: 'This account is configured for social login. Please log in using Google or GitHub.' });
    }

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

// Google OAuth Sign In / Sign Up
router.post('/google', async (req: AuthRequest, res: Response) => {
  try {
    const { token, role, name: reqName, email: reqEmail, college } = req.body;

    if (!token || !role) {
      return res.status(400).json({ message: 'Token and role are required.' });
    }

    let email: string;
    let name: string;
    let googleId: string;

    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    // Local Testing / Developer Fallback Mode
    if (token === 'mock-google-token' || !googleClientId) {
      console.log('Google Auth: Using Developer Testing Fallback Mode');
      email = reqEmail || 'mock_google_user@kiit.ac.in';
      name = reqName || 'Mock Google User';
      googleId = 'mock-google-id-' + email.split('@')[0];
    } else {
      // Real Google token verification
      try {
        const tokenVerifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (!tokenVerifyRes.ok) {
          return res.status(400).json({ message: 'Invalid Google ID token.' });
        }
        const payload = await tokenVerifyRes.json() as any;
        
        // Verify client ID matches if configured
        if (payload.aud !== googleClientId) {
          return res.status(400).json({ message: 'Token audience mismatch. Client ID mismatch.' });
        }

        email = payload.email;
        name = payload.name || payload.given_name || email.split('@')[0];
        googleId = payload.sub;
      } catch (err: any) {
        return res.status(400).json({ message: 'Failed to verify Google token.', error: err.message });
      }
    }

    // Check if user exists
    let user = await User.findOne({ where: { email } });

    if (user) {
      // Role verification
      if (user.role !== role) {
        return res.status(400).json({ message: `An account with this email already exists as a ${user.role}.` });
      }
      // Link Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Register passwordless user
      const referralsSentCount = role === 'alumni' ? 0 : undefined;
      const availability = role === 'alumni' ? 'Available Now' : undefined;
      const responseRate = role === 'alumni' ? '92%' : undefined;
      const responseSpeed = role === 'alumni' ? 'Within 1 day' : undefined;
      const successRate = role === 'alumni' ? '0 referred' : undefined;

      user = await User.create({
        email,
        role,
        name,
        college: college || 'University Network',
        googleId,
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
    }

    const localToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token: localToken,
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
    res.status(500).json({ message: 'Server error during Google auth.', error: error.message });
  }
});

// GitHub OAuth Sign In / Sign Up
router.post('/github', async (req: AuthRequest, res: Response) => {
  try {
    const { code, role, name: reqName, email: reqEmail, college } = req.body;

    if (!code || !role) {
      return res.status(400).json({ message: 'Code and role are required.' });
    }

    let email: string;
    let name: string;
    let githubId: string;

    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

    // Local Testing / Developer Fallback Mode
    if (code === 'mock-github-code' || !githubClientId || !githubClientSecret) {
      console.log('GitHub Auth: Using Developer Testing Fallback Mode');
      email = reqEmail || 'mock_github_user@kiit.ac.in';
      name = reqName || 'Mock GitHub User';
      githubId = 'mock-github-id-' + email.split('@')[0];
    } else {
      // Real GitHub token exchange
      try {
        // Exchange code for access token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            client_id: githubClientId,
            client_secret: githubClientSecret,
            code
          })
        });

        if (!tokenRes.ok) {
          return res.status(400).json({ message: 'Failed to exchange GitHub authorization code.' });
        }

        const tokenData = await tokenRes.json() as any;
        const accessToken = tokenData.access_token;

        if (!accessToken) {
          return res.status(400).json({ message: 'GitHub did not return an access token.', error: tokenData });
        }

        // Fetch User Profile
        const profileRes = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${accessToken}`,
            'User-Agent': 'NextInCampus-Backend'
          }
        });

        if (!profileRes.ok) {
          return res.status(400).json({ message: 'Failed to fetch user profile from GitHub.' });
        }

        const profileData = await profileRes.json() as any;
        githubId = String(profileData.id);
        name = profileData.name || profileData.login || 'GitHub User';

        // Fetch Email
        if (profileData.email) {
          email = profileData.email;
        } else {
          // GitHub might not return the email in the main profile if it is private. Fetch emails array.
          const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: {
              'Authorization': `token ${accessToken}`,
              'User-Agent': 'NextInCampus-Backend'
            }
          });

          if (emailsRes.ok) {
            const emails = await emailsRes.json() as any[];
            const primaryEmailObj = emails.find(e => e.primary && e.verified) || emails[0];
            email = primaryEmailObj ? primaryEmailObj.email : `${profileData.login}@github.com`;
          } else {
            email = `${profileData.login}@github.com`;
          }
        }
      } catch (err: any) {
        return res.status(400).json({ message: 'Failed to authenticate with GitHub.', error: err.message });
      }
    }

    // Check if user exists
    let user = await User.findOne({ where: { email } });

    if (user) {
      // Role verification
      if (user.role !== role) {
        return res.status(400).json({ message: `An account with this email already exists as a ${user.role}.` });
      }
      // Link GitHub ID if not set
      if (!user.githubId) {
        user.githubId = githubId;
        await user.save();
      }
    } else {
      // Register passwordless user
      const referralsSentCount = role === 'alumni' ? 0 : undefined;
      const availability = role === 'alumni' ? 'Available Now' : undefined;
      const responseRate = role === 'alumni' ? '92%' : undefined;
      const responseSpeed = role === 'alumni' ? 'Within 1 day' : undefined;
      const successRate = role === 'alumni' ? '0 referred' : undefined;

      user = await User.create({
        email,
        role,
        name,
        college: college || 'University Network',
        githubId,
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
    }

    const localToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token: localToken,
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
    res.status(500).json({ message: 'Server error during GitHub auth.', error: error.message });
  }
});

export default router;
