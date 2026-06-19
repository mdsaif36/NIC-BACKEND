import { Application } from 'express';
import { Notification, NotificationType } from '../models/Notification.js';

// ─── Notification Service ─────────────────────────────────────────────────────
// Unified helper for creating and delivering in-app notifications.
// Persists to DB (durable) AND delivers live via Socket.IO (instant).
//
// Usage in any route:
//   import { notifyUser } from '../utils/notificationService.js';
//   await notifyUser(app, {
//     userId: alumniId,
//     type: 'referral_received',
//     title: '📬 New Referral Request',
//     message: `${seekerName} has sent you a referral request.`,
//     actionUrl: '?tab=inbox',
//     metadata: { requestId: request.id, seekerName },
//   });
// ──────────────────────────────────────────────────────────────────────────────

interface NotifyPayload {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification, persist it to DB, and emit it via Socket.IO.
 * Returns the created Notification record.
 */
export const notifyUser = async (
  app: Application,
  payload: NotifyPayload
): Promise<Notification> => {
  // 1. Persist to DB (survives page refreshes / reconnects)
  const notification = await Notification.create({
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    isRead: false,
    actionUrl: payload.actionUrl,
    metadata: payload.metadata,
  });

  // 2. Emit live via Socket.IO if connected
  const io = app.get('io');
  if (io) {
    io.to(`user_${payload.userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    });
  }

  return notification;
};

/**
 * Bulk-notify multiple users at once (e.g. admin announcements).
 */
export const notifyMany = async (
  app: Application,
  userIds: number[],
  payload: Omit<NotifyPayload, 'userId'>
): Promise<void> => {
  await Promise.all(
    userIds.map((userId) => notifyUser(app, { ...payload, userId }))
  );
};
