import { Router, Response } from 'express';
import { Notification } from '../models/Notification.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { Op } from 'sequelize';

// ─── Notification Routes ───────────────────────────────────────────────────────
// All routes require authentication. Users can only see their own notifications.
//
// GET  /api/notifications          — get unread + recent read (last 50)
// GET  /api/notifications/unread-count — number of unread notifications
// PUT  /api/notifications/:id/read — mark single notification as read
// PUT  /api/notifications/read-all — mark all notifications as read
// DELETE /api/notifications/:id    — delete a single notification
// ──────────────────────────────────────────────────────────────────────────────

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get recent notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Array of notifications ordered by newest first
 */
router.get('/', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
    });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching notifications.', error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: { count: number }
 */
router.get('/unread-count', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const count = await Notification.count({
      where: { userId, isRead: false },
    });
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ message: 'Error counting notifications.', error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.put('/read-all', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error marking notifications.', error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.put('/:id/read', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    notification.isRead = true;
    await notification.save();

    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating notification.', error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const deleted = await Notification.destroy({
      where: { id: req.params.id, userId },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json({ message: 'Notification deleted.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting notification.', error: error.message });
  }
});

export default router;
