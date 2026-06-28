import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

/**
 * Sends a role-tailored welcome email to newly registered users
 */
export const sendWelcomeEmail = async (email: string, name: string, role: string) => {
  const isSeeker = role === 'seeker';
  const fromEmail = process.env.FROM_EMAIL || 'NextInCampus <onboarding@nextincampus.in>';

  const subject = isSeeker 
    ? "Welcome to NextInCampus – Your Referral Credits are ready!" 
    : "Welcome to the NextInCampus Inner Circle";

  const htmlContent = isSeeker 
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">
        <p>Hi ${name},</p>
        <p>Welcome to NextInCampus. You are now part of an elite network designed to bypass the 'resume black hole.'</p>
        <p>Your dashboard is active, and your 5 Premium Referral Credits have been credited to your account. Remember: quality beats quantity here. Use your credits to pitch to the mentors who best align with your career goals.</p>
        <p>Let’s get you referred.</p>
        <p>Best,<br/>The NextInCampus Team</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">
        <p>Hi ${name},</p>
        <p>Welcome to NextInCampus. We are honored to have an experienced professional like you in our network.</p>
        <p>Your expertise is the most valuable part of our platform. By joining, you are helping us maintain a 'zero-spam' environment where top-tier students can connect with insiders like you. You will now receive curated referral requests from candidates who have passed our platform's intent-filter.</p>
        <p>Thank you for choosing to pay it forward.</p>
        <p>Best,<br/>The NextInCampus Team</p>
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
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">
          <h2>Password Reset</h2>
          <p>You requested to reset your password. Click the link below to create a new one. This link will expire in 15 minutes.</p>
          <a href="${resetLink}" style="padding: 10px 20px; background-color: #10B981; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    });
    console.log(`Password reset email sent to: ${email}`);
  } catch (error) {
    console.error("Resend Error (Password Reset):", error);
  }
};
