import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { notifyUser } from '../utils/notificationService.js';

const router = Router();

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get all conversations for the current user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 */
router.get('/conversations', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      },
      order: [['createdAt', 'DESC']],
    });

    // Group by unique partner — keep only last message per partner
    const partnersMap = new Map<number, Message>();
    messages.forEach((msg) => {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!partnersMap.has(partnerId)) partnersMap.set(partnerId, msg);
    });

    const partnerIds = Array.from(partnersMap.keys());
    const users = await User.findAll({
      where: { id: partnerIds },
      attributes: ['id', 'name', 'company', 'college', 'jobTitle', 'role', 'availability'],
    });

    const conversations = users.map((user) => {
      const lastMsg = partnersMap.get(user.id)!;
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        company: user.company,
        college: user.college,
        jobTitle: user.jobTitle,
        availability: user.availability,
        lastMessage: lastMsg.text,
        lastMessageTime: lastMsg.createdAt,
        isSystem: lastMsg.isSystem,
      };
    });

    conversations.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());

    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving conversations.', error: error.message });
  }
});

/**
 * @swagger
 * /api/messages/history/{partnerId}:
 *   get:
 *     summary: Get full chat history with a specific user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/history/:partnerId', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const partnerId = req.params.partnerId;

    const history = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      order: [['createdAt', 'ASC']],
    });

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving chat history.', error: error.message });
  }
});

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a chat message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId, text]
 *             properties:
 *               receiverId: { type: integer }
 *               text:       { type: string }
 */
router.post('/', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const sender = req.user!;
    const { receiverId, text } = req.body;

    if (!receiverId || !text) {
      return res.status(400).json({ message: 'Receiver and text are required.' });
    }

    const message = await Message.create({
      senderId: sender.id,
      receiverId,
      text,
      isSystem: false,
    });

    // ── Notify receiver ────────────────────────────────────────────────────────
    await notifyUser(req.app, {
      userId: receiverId,
      type: 'message_received',
      title: `💬 New message from ${sender.name}`,
      message: text.length > 80 ? text.slice(0, 80) + '…' : text,
      actionUrl: '?tab=messages',
      metadata: { senderId: sender.id, senderName: sender.name, messageId: message.id },
    });

    // Audit
    logAudit(req, 'MESSAGE_SENT', 'Message', message.id, { receiverId, textLength: text.length });

    // Socket.IO live delivery
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('message', message.toJSON());
      io.to(`user_${sender.id}`).emit('message', message.toJSON());
    }

    // ── Seeded mentor auto-reply (dev / demo mode) ─────────────────────────────
    const receiver = await User.findByPk(receiverId);
    if (receiver && receiver.role === 'alumni' && receiver.id <= 6) {
      setTimeout(async () => {
        try {
          let replyText = `Hey! Thanks for reaching out. I've received your note and will review your profile shortly. Let me know if you have specific questions about ${receiver.company}!`;
          const lowerText = text.toLowerCase();

          if (lowerText.includes('refer') || lowerText.includes('resume') || lowerText.includes('cv')) {
            replyText = `Your profile looks really promising! I will review your projects and submit a referral request on our internal ${receiver.company} career portal today. Keep an eye on your email!`;
          } else if (lowerText.includes('schedule') || lowerText.includes('call') || lowerText.includes('meeting')) {
            replyText = `I'd love to jump on a quick call! Please use the 'Schedule Call' button above to pick a time on my calendar.`;
          } else if (lowerText.includes('thank')) {
            replyText = `You're very welcome! Always happy to help motivated juniors. Let me know how the interviews go!`;
          }

          const replyMsg = await Message.create({
            senderId: receiverId,
            receiverId: sender.id,
            text: replyText,
            isSystem: false,
          });

          if (io) {
            io.to(`user_${sender.id}`).emit('message', replyMsg.toJSON());
            io.to(`user_${receiverId}`).emit('message', replyMsg.toJSON());
          }
        } catch (err) {
          console.error('Auto-reply error:', err);
        }
      }, 2000);
    }

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ message: 'Error sending message.', error: error.message });
  }
});

/**
 * @swagger
 * /api/messages/schedule:
 *   post:
 *     summary: Schedule a call (creates a system message)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId, date, time]
 *             properties:
 *               receiverId: { type: integer }
 *               date:       { type: string }
 *               time:       { type: string }
 */
router.post('/schedule', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const sender = req.user!;
    const { receiverId, date, time, topic, duration } = req.body;

    if (!receiverId || !date || !time) {
      return res.status(400).json({ message: 'Receiver, date, and time are required.' });
    }

    const topicStr = topic ? ` | Topic: ${topic}` : '';
    const durationStr = duration ? ` | Duration: ${duration}` : '';
    const scheduledText = `📅 Meeting Scheduled for ${date} at ${time}${topicStr}${durationStr}.`;

    const message = await Message.create({
      senderId: sender.id,
      receiverId,
      text: scheduledText,
      isSystem: true,
    });

    // Notify receiver
    await notifyUser(req.app, {
      userId: receiverId,
      type: 'meeting_scheduled',
      title: '📅 Meeting Scheduled',
      message: `${sender.name} has scheduled a meeting on ${date} at ${time}${topicStr}${durationStr}.`,
      actionUrl: '?tab=messages',
      metadata: { senderId: sender.id, senderName: sender.name, date, time, topic, duration },
    });

    // Audit
    logAudit(req, 'MEETING_SCHEDULED', 'Message', message.id, { receiverId, date, time, topic, duration });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('message', message.toJSON());
      io.to(`user_${sender.id}`).emit('message', message.toJSON());
    }

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ message: 'Error scheduling meeting.', error: error.message });
  }
});

export default router;
