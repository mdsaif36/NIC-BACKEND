import { Router } from 'express';
import { Resend } from 'resend';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/report-issue', async (req, res) => {
  const { description, pageUrl, userEmail, userName, userRole, createdAt } = req.body;

  try {
    // EMAIL 1: The Report to YOU
    await resend.emails.send({
      from: 'NextInCampus Alerts <notifications@nextincampus.in>',
      to: 'nextincampus@gmail.com',
      subject: `🚨 Issue: ${String(userRole).toUpperCase()} Report`,
      html: `
        <h3>New Issue Report</h3>
        <p><strong>Name:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Account Created:</strong> ${createdAt}</p>
        <p><strong>Role:</strong> ${userRole}</p>
        <p><strong>URL:</strong> ${pageUrl}</p>
        <p><strong>Issue:</strong><br>${description?.replace(/\n/g, '<br>')}</p>
      `,
    });

    // EMAIL 2: The Auto-Reply to the USER
    // Only send if they provided an email (i.e. they are logged in)
    if (userEmail && userEmail !== 'Anonymous') {
      await resend.emails.send({
        from: 'NextInCampus Support <notifications@nextincampus.in>',
        to: userEmail,
        subject: 'We have received your report',
        html: `
          <p>Hi ${userName},</p>
          <p>We’ve received your report regarding an issue on our platform. Thank you for helping us improve!</p>
          <p>Our team reviews all reports personally. You can expect an update or a resolution within 24 hours.</p>
          <br>
          <p>Best,<br>The NextInCampus Team</p>
        `,
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).json({ error: "Failed to send emails" });
  }
});

export default router;
