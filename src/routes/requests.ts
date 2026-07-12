import { Router, Response } from 'express';
import { ReferralRequest } from '../models/ReferralRequest.js';
import { User } from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAlumni, requireSeeker } from '../middleware/rbac.js';
import { logAudit } from '../middleware/audit.js';
import { notifyUser } from '../utils/notificationService.js';
import { Op } from 'sequelize';

const router = Router();

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Seeker submits a referral request to an alumni
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [alumniId, targetRole, timeline, pitchMessage]
 *             properties:
 *               alumniId:   { type: integer }
 *               targetRole: { type: string }
 *               timeline:   { type: string }
 *               pitchMessage: { type: string }
 *     responses:
 *       201:
 *         description: Request created
 *       403:
 *         description: Role mismatch or cooling period
 */
router.post('/', authenticate as any, requireSeeker, async (req: AuthRequest, res: Response) => {
  try {
    const seeker = req.user!;
    const { alumniId, targetRole, timeline, pitchMessage, location } = req.body;

    if (!alumniId || !targetRole || !timeline || !pitchMessage) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Verify alumni exists
    const alumni = await User.findByPk(alumniId);
    if (!alumni || alumni.role !== 'alumni') {
      return res.status(404).json({ message: 'Alumni not found.' });
    }

    // Deduct referral credit
    if (seeker.referralCreditsRemaining > 0) {
      seeker.referralCreditsRemaining -= 1;
      await seeker.save();
    }

    // Create request
    const request = await ReferralRequest.create({
      seekerId: seeker.id,
      alumniId,
      targetRole,
      location: location || 'Remote',
      timeline,
      pitchMessage,
      status: 'pending',
    });

    // ── Notifications & Audit ──────────────────────────────────────────────────

    // Notify alumni (DB + Socket.IO)
    await notifyUser(req.app, {
      userId: alumniId,
      type: 'referral_received',
      title: '📬 New Referral Request',
      message: `${seeker.name} from ${seeker.college} has sent you a referral request for ${targetRole}.`,
      actionUrl: '?tab=inbox',
      metadata: { requestId: request.id, seekerId: seeker.id, seekerName: seeker.name, targetRole },
    });

    // Audit log
    logAudit(req, 'REFERRAL_REQUESTED', 'ReferralRequest', request.id, {
      alumniId,
      targetRole,
      creditsRemaining: seeker.referralCreditsRemaining,
    });

    // Legacy Socket.IO direct emit (kept for backward compat with frontend listeners)
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${alumniId}`).emit('new_request', {
        id: request.id,
        studentName: seeker.name,
        class: `${seeker.branch || 'CSE'} ${seeker.year || '3rd Year'}, ${seeker.college || 'IIT Bombay'}`,
        company: alumni.company || '',
        role: targetRole,
        location: request.location,
        score: '94% Match',
        message: pitchMessage,
        status: 'pending',
        seekerId: seeker.id,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: new Date().toISOString(),
        resumeName: seeker.resumeName || '',
        resumeUploaded: Boolean(seeker.resumeName || seeker.resumeUploaded),
        seeker: seeker,
      });
    }

    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting referral request.', error: error.message });
  }
});

/**
 * @swagger
 * /api/requests/seeker:
 *   get:
 *     summary: Get all referral requests sent by the current seeker
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 */
router.get('/seeker', authenticate as any, requireSeeker, async (req: AuthRequest, res: Response) => {
  try {
    const seeker = req.user!;

    const list = await ReferralRequest.findAll({
      where: { seekerId: seeker.id },
      include: [
        {
          model: User,
          as: 'alumni',
          attributes: ['id', 'name', 'company', 'college', 'jobTitle', 'availability'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving seeker requests.', error: error.message });
  }
});

/**
 * @swagger
 * /api/requests/alumni:
 *   get:
 *     summary: Get all referral requests received by the current alumni
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 */
router.get('/alumni', authenticate as any, requireAlumni, async (req: AuthRequest, res: Response) => {
  try {
    const alumni = req.user!;

    const list = await ReferralRequest.findAll({
      where: { alumniId: alumni.id },
      include: [
        {
          model: User,
          as: 'seeker',
          attributes: [
            'id', 'name', 'email', 'college', 'year', 'branch',
            'skills', 'skillDetails', 'projects', 'targetCompanies',
            'targetRole', 'bio', 'githubUrl', 'linkedinUrl',
            'resumeName', 'resumeUploaded',
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving alumni requests.', error: error.message });
  }
});

/**
 * @swagger
 * /api/requests/{id}/status:
 *   put:
 *     summary: Alumni updates a request status (accepted/declined/referred/info)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, declined, hired, referred, info]
 */
router.put('/:id/status', authenticate as any, requireAlumni, async (req: AuthRequest, res: Response) => {
  try {
    const alumni = req.user!;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const request = await ReferralRequest.findOne({
      where: { id: req.params.id, alumniId: alumni.id },
    });

    if (!request) {
      return res.status(404).json({ message: 'Referral request not found.' });
    }

    const oldStatus = request.status;
    request.status = status;
    await request.save();

    // If fully referred, increment alumni referral count
    if (status === 'referred' && oldStatus !== 'referred') {
      alumni.referralsSentCount += 1;
      alumni.successRate = `${alumni.referralsSentCount} referred`;
      await alumni.save();
    }

    // ── Notification to seeker ────────────────────────────────────────────────
    const notifMap: Record<string, { type: any; title: string; msg: string }> = {
      accepted: {
        type: 'referral_accepted',
        title: '✅ Referral Request Accepted',
        msg: `${alumni.name} from ${alumni.company} has accepted your referral request! You can now chat.`,
      },
      declined: {
        type: 'referral_declined',
        title: '❌ Referral Request Declined',
        msg: `${alumni.name} has declined your request. Don't give up — try another mentor!`,
      },
      referred: {
        type: 'referral_referred',
        title: '🎉 You\'ve Been Referred!',
        msg: `${alumni.name} from ${alumni.company} has officially referred you. Check your email for next steps!`,
      },
      info: {
        type: 'referral_info',
        title: '💬 Alumni Needs More Info',
        msg: `${alumni.name} has requested additional information before deciding. Please respond in chat.`,
      },
    };

    const notifConfig = notifMap[status];
    if (notifConfig) {
      await notifyUser(req.app, {
        userId: request.seekerId,
        type: notifConfig.type,
        title: notifConfig.title,
        message: notifConfig.msg,
        actionUrl: '?tab=my_referrals',
        metadata: { requestId: request.id, alumniId: alumni.id, alumniName: alumni.name, status },
      });
    }

    // Audit log
    const actionMap: Record<string, any> = {
      accepted:  'REFERRAL_ACCEPTED',
      declined:  'REFERRAL_DECLINED',
      referred:  'REFERRAL_REFERRED',
      info:      'REFERRAL_INFO_REQUESTED',
    };
    const auditAction = actionMap[status];
    if (auditAction) {
      logAudit(req, auditAction, 'ReferralRequest', request.id, {
        seekerId: request.seekerId,
        oldStatus,
        newStatus: status,
      });
    }

    // Legacy Socket.IO emit
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${request.seekerId}`).emit('request_status_update', {
        id: request.id,
        status: request.status,
      });
    }

    res.json(request);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating request status.', error: error.message });
  }
});

/**
 * @swagger
 * /api/requests/{id}/rate:
 *   put:
 *     summary: Seeker rates their experience with the alumni for a referral request
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               feedback: { type: string }
 *     responses:
 *       200:
 *         description: Request rated successfully
 *       404:
 *         description: Request not found or unauthorized
 */
router.put('/:id/rate', authenticate as any, requireSeeker, async (req: AuthRequest, res: Response) => {
  try {
    const seeker = req.user!;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
    }

    const request = await ReferralRequest.findOne({
      where: { id: req.params.id, seekerId: seeker.id }
    });

    if (!request) {
      return res.status(404).json({ message: 'Referral request not found or unauthorized.' });
    }

    request.rating = rating;
    request.ratingFeedback = feedback || null;
    await request.save();

    // Log audit action
    logAudit(req, 'REFERRAL_RATED', 'ReferralRequest', request.id, {
      alumniId: request.alumniId,
      rating,
      feedback
    });

    // Notify alumni about rating
    const alumni = await User.findByPk(request.alumniId);
    if (alumni) {
      // Recalculate average rating of the alumni
      const ratingStats = await ReferralRequest.findAll({
        where: { alumniId: alumni.id, rating: { [Op.ne]: null } },
        attributes: [[ReferralRequest.sequelize!.fn('AVG', ReferralRequest.sequelize!.col('rating')), 'avgRating']],
        raw: true
      }) as any[];
      const avgRaw = ratingStats[0]?.avgRating;
      const avg = avgRaw ? Math.round(Number(avgRaw) * 100) / 100 : 5.0;
      await notifyUser(req.app, {
        userId: alumni.id,
        type: 'referral_rated',
        title: '⭐ You Received a Rating!',
        message: `${seeker.name} rated your referral support: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}.`,
        actionUrl: '?tab=leaderboard',
        metadata: { requestId: request.id, rating, seekerName: seeker.name }
      });
    }

    res.json(request);
  } catch (error: any) {
    res.status(500).json({ message: 'Error rating referral request.', error: error.message });
  }
});

export default router;
