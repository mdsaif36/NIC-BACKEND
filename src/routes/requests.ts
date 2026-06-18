import { Router, Response } from 'express';
import { ReferralRequest } from '../models/ReferralRequest.js';
import { User } from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Seeker: Submit referral request to alumni
router.post('/', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const seeker = req.user;
    if (!seeker || seeker.role !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can submit referral requests.' });
    }

    const { alumniId, targetRole, timeline, pitchMessage } = req.body;

    if (!alumniId || !targetRole || !timeline || !pitchMessage) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Verify alumni exists and is an alumni
    const alumni = await User.findByPk(alumniId);
    if (!alumni || alumni.role !== 'alumni') {
      return res.status(404).json({ message: 'Alumni not found.' });
    }

    // Create the request
    const request = await ReferralRequest.create({
      seekerId: seeker.id,
      alumniId,
      targetRole,
      timeline,
      pitchMessage,
      status: 'pending',
    });

    // Notify the alumni in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${alumniId}`).emit('new_request', {
        id: request.id,
        studentName: seeker.name,
        class: `${seeker.branch || 'CSE'} ${seeker.year || '3rd Year'}, ${seeker.college || 'IIT Bombay'}`,
        company: alumni.company || '',
        role: targetRole,
        score: '94% Match',
        message: pitchMessage,
        status: 'pending',
        seekerId: seeker.id,
        resumeName: seeker.resumeName || '',
        resumeUploaded: seeker.resumeUploaded || false
      });
    }

    res.status(201).json(request);
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting referral request.', error: error.message });
  }
});

// Seeker: Get list of requests sent
router.get('/seeker', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const seeker = req.user;
    if (!seeker || seeker.role !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can fetch sent requests.' });
    }

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

// Alumni: Get list of requests received
router.get('/alumni', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const alumni = req.user;
    if (!alumni || alumni.role !== 'alumni') {
      return res.status(403).json({ message: 'Only alumni can fetch received requests.' });
    }

    const list = await ReferralRequest.findAll({
      where: { alumniId: alumni.id },
      include: [
        {
          model: User,
          as: 'seeker',
          attributes: [
            'id',
            'name',
            'college',
            'year',
            'branch',
            'skills',
            'skillDetails',
            'resumeName',
            'resumeUploaded',
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

// Alumni: Update request status
router.put('/:id/status', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const alumni = req.user;
    if (!alumni || alumni.role !== 'alumni') {
      return res.status(403).json({ message: 'Only alumni can update request statuses.' });
    }

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

    // If request transitions to 'referred', increment alumni's referrals count and update success rate text
    if (status === 'referred' && oldStatus !== 'referred') {
      alumni.referralsSentCount += 1;
      alumni.successRate = `${alumni.referralsSentCount} referred`;
      await alumni.save();
    }

    // Notify the seeker of the status update in real-time
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

export default router;
