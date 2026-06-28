import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

/**
 * Sends a role-tailored welcome email to newly registered users
 */
export const sendWelcomeEmail = async (email: string, name: string, role: string) => {
  const isSeeker = role === 'seeker';
  const fromEmail = process.env.FROM_EMAIL || 'NextInCampus <onboarding@nextincampus.in>';

  const subject = isSeeker 
    ? "You’re in. Welcome to the future of your career." 
    : "Welcome to the NextInCampus Inner Circle";

  const htmlContent = isSeeker 
    ? `
      <div style="font-family: sans-serif; max-width: 650px; margin: auto; padding: 30px; color: #1e293b; line-height: 1.6; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <p style="font-size: 16px; font-weight: 650; margin-top: 0; color: #0f172a;">Hi ${name},</p>
        <p style="font-size: 15px; margin-bottom: 20px;">Welcome to NextInCampus.</p>
        <p style="font-size: 15px; margin-bottom: 20px;">You’ve taken a decisive step away from the "resume black hole" and into a network designed for those who refuse to leave their career to chance. We built this platform for the ambitious—for the students who have the talent, the drive, and the vision to succeed, but haven't yet been given the right spotlight.</p>
        <p style="font-size: 15px; margin-bottom: 25px;">By joining us, you aren't just signing up for a platform; you are joining a community where your potential finally gets the visibility it deserves.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="https://nextincampus.in/dashboard" style="background-color: #1e40ff; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 9999px; display: inline-block; box-shadow: 0 4px 10px rgba(30, 64, 255, 0.2);">Access Your Dashboard</a>
        </div>
        
        <p style="font-size: 15px; margin-bottom: 20px;">We’re glad you’re here. Let’s make your next career chapter your best one yet.</p>
        
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 35px 0 25px 0;" />
        <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
          Best,<br/>
          <strong>The NextInCampus Team</strong>
        </p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 650px; margin: auto; padding: 30px; color: #1e293b; line-height: 1.6; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <p style="font-size: 16px; font-weight: 650; margin-top: 0; color: #0f172a;">Hi ${name},</p>
        <p style="font-size: 15px; margin-bottom: 20px;">Welcome to NextInCampus.</p>
        <p style="font-size: 15px; margin-bottom: 20px;">Your expertise is the most valuable asset in our ecosystem. We built this platform to fix a broken hiring culture, and having you here as a verified insider is exactly what will make that shift possible.</p>
        <p style="font-size: 15px; margin-bottom: 25px;">You are now part of a curated network where quality and intent are the only currencies that matter. We’ve removed the noise so you can focus on what you do best: identifying and empowering the next generation of top-tier talent.</p>
        <p style="font-size: 15px; margin-bottom: 25px;">Thank you for your commitment to excellence and for helping us redefine how professional connections are made.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="https://nextincampus.in/alumni-dashboard" style="background-color: #e11d48; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 9999px; display: inline-block; box-shadow: 0 4px 10px rgba(225, 29, 72, 0.2);">View Your Mentorship Inbox</a>
        </div>
        
        <p style="font-size: 15px; margin-bottom: 20px;">Welcome aboard.</p>
        
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 35px 0 25px 0;" />
        <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
          Best,<br/>
          <strong>The NextInCampus Team</strong>
        </p>
      </div>
    `;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: subject,
      html: htmlContent,
    });
    console.log(`Welcome email sent to ${role}: ${email}`);
  } catch (error) {
    console.error("Resend Error (Welcome Email):", error);
  }
};

/**
 * Sends a password reset link to user
 */
export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
  const fromEmail = process.env.FROM_EMAIL || 'NextInCampus <onboarding@nextincampus.in>';

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: sans-serif; max-width: 650px; margin: auto; padding: 30px; color: #1e293b; line-height: 1.6; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0;">Password Reset</h2>
          <p>You requested to reset your password. Click the link below to create a new one. This link will expire in 15 minutes.</p>
          <div style="margin: 25px 0;">
            <a href="${resetLink}" style="padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 9999px; display: inline-block; font-weight: 600; font-size: 14px;">Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #64748b;">If you did not request this, please ignore this email.</p>
        </div>
      `
    });
    console.log(`Password reset email sent to: ${email}`);
  } catch (error) {
    console.error("Resend Error (Password Reset):", error);
  }
};
