import { Router } from 'express';
import { Resend } from 'resend';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/report-issue', async (req, res) => {
  const { description, pageUrl } = req.body;

  try {
    await resend.emails.send({
      // Use your verified domain email
      from: 'NextInCampus Support <notifications@nextincampus.in>',
      // This is where you receive the bug reports
      to: 'nextincampus@gmail.com', 
      subject: '🚨 New Issue Reported',
      html: `
        <h3>Bug Report Received</h3>
        <p><strong>Page URL:</strong> ${pageUrl}</p>
        <p><strong>Description:</strong></p>
        <p>${description?.replace(/\n/g, '<br>')}</p>
      `,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).json({ error: "Failed to send report" });
  }
});

export default router;
