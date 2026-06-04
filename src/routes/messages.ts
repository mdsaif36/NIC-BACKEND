import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get Conversations list
router.get('/conversations', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Fetch all messages involving the current user
    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      },
      order: [['createdAt', 'DESC']],
    });

    // Group by unique partner ID and pick the last message
    const partnersMap = new Map<number, Message>();
    messages.forEach((msg) => {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!partnersMap.has(partnerId)) {
        partnersMap.set(partnerId, msg);
      }
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

    // Sort conversations by last message time descending
    conversations.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());

    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving conversations.', error: error.message });
  }
});

// Get Chat History with a specific user
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

// Send Chat Message Route
router.post('/', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { receiverId, text } = req.body;

    if (!receiverId || !text) {
      return res.status(400).json({ message: 'Receiver and text are required.' });
    }

    const message = await Message.create({
      senderId: userId,
      receiverId,
      text,
      isSystem: false,
    });

    // Notify receiver via Socket.IO if they are connected
    const io = req.app.get('io');
    if (io) {
      // Emit to rooms representing sender and receiver
      io.to(`user_${receiverId}`).emit('message', message.toJSON());
      io.to(`user_${userId}`).emit('message', message.toJSON());
    }

    // Simulating alumni responses for seeded mentors to support rich single-player testing
    const receiver = await User.findByPk(receiverId);
    if (receiver && receiver.role === 'alumni' && receiver.id <= 6) {
      setTimeout(async () => {
        try {
          let replyText = `Hey! Thanks for reaching out. I've received your note and will review your profile shortly. Let me know if you have specific questions about ${receiver.company}!`;
          const lowerText = text.toLowerCase();
          
          if (lowerText.includes('refer') || lowerText.includes('referral') || lowerText.includes('resume') || lowerText.includes('cv')) {
            replyText = `Your profile looks really promising! I will review your projects and submit a referral request on our internal ${receiver.company} career portal today. Keep an eye on your email!`;
          } else if (lowerText.includes('schedule') || lowerText.includes('call') || lowerText.includes('chat') || lowerText.includes('meeting')) {
            replyText = `I'd love to jump on a quick call to chat about the role! Please use the 'Schedule Call' button above to pick a convenient time on my calendar, and we can align.`;
          } else if (lowerText.includes('thank') || lowerText.includes('thanks') || lowerText.includes('appreciate')) {
            replyText = `You're very welcome! Always happy to help motivated juniors. Let me know how the interview loops go!`;
          }

          const replyMsg = await Message.create({
            senderId: receiverId,
            receiverId: userId,
            text: replyText,
            isSystem: false,
          });

          if (io) {
            io.to(`user_${userId}`).emit('message', replyMsg.toJSON());
            io.to(`user_${receiverId}`).emit('message', replyMsg.toJSON());
          }
        } catch (err) {
          console.error("Auto-reply logic error:", err);
        }
      }, 2000);
    }

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ message: 'Error sending message.', error: error.message });
  }
});

// Schedule Call Route
router.post('/schedule', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { receiverId, date, time } = req.body;

    if (!receiverId || !date || !time) {
      return res.status(400).json({ message: 'Receiver, date, and time are required.' });
    }

    const scheduledText = `📅 Scheduled a call for ${date} at ${time}. (Video Call Room Ready)`;

    const message = await Message.create({
      senderId: userId,
      receiverId,
      text: scheduledText,
      isSystem: true,
    });

    // Notify receiver via Socket.IO if connected
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('message', message.toJSON());
      io.to(`user_${userId}`).emit('message', message.toJSON());
    }

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ message: 'Error scheduling call.', error: error.message });
  }
});

export default router;
