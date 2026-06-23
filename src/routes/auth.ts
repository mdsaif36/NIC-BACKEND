import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import { User } from '../models/User.js';
import { authenticate, AuthRequest, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

if (!process.env.RESEND_API_KEY) {
  console.warn("⚠️ RESEND_API_KEY is not defined. Password reset emails will fail to send.");
}
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

// Sign Up Route
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role, name, college, company, jobTitle } = req.body;

    if (!email || !password || !role || !name || !college) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const safeEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: safeEmail } });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this email already exists. Please log in.',
        error: 'An account with this email already exists. Please log in.' 
      });
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
      email: safeEmail,
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

    const safeEmail = email.trim().toLowerCase();

    const user = await User.findOne({ where: { email: safeEmail } });
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

    const safeEmail = email.trim().toLowerCase();

    // Check if user exists
    let user = await User.findOne({ where: { email: safeEmail } });

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
        email: safeEmail,
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

    const safeEmail = email.trim().toLowerCase();

    // Check if user exists
    let user = await User.findOne({ where: { email: safeEmail } });

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
        email: safeEmail,
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

// Forgot Password Endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const safeEmail = email.trim().toLowerCase();

    // A. Check if the user exists in database
    const user = await User.findOne({ where: { email: safeEmail } });
    if (!user) {
      // For security, return success even if user not found, so users can't scan registered emails
      return res.status(200).json({ message: "If this email exists, a reset link was sent." });
    }

    // B. Generate a random 32-character security token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Set expiry to 15 minutes from now
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); 

    // C. Save the token and expiry into the DB
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // D. Send the email using Resend
    const resetLink = `https://nic-frontend-beta.vercel.app/reset-password?token=${resetToken}`;

    // FIRE AND FORGET USING RESEND
    resend.emails.send({
      from: 'NextInCampus <onboarding@resend.dev>', // Resend gives you this free testing email!
      to: email, // IMPORTANT: While testing on the free tier, this MUST be the email you used to sign up for Resend!
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>You requested to reset your password. Click the link below to create a new one. This link will expire in 15 minutes.</p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #10B981; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `
    }).catch(err => console.error("Resend error:", err));

    res.status(200).json({ message: "Password reset link sent to email." });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Error sending email.", error: error.message });
  }
});

// Reset Password Endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required." });
    }

    // A. Find the user with this token
    const user = await User.findOne({ where: { resetToken: token } });

    // B. Check token expiry
    if (!user || !user.resetTokenExpiry || new Date(user.resetTokenExpiry).getTime() < Date.now()) {
      return res.status(400).json({ message: "Token is invalid or has expired." });
    }

    // C. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // D. Update the password in DB and delete the used token
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been successfully reset!" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password.", error: error.message });
  }
});

export default router;
