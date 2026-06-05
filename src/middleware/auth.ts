import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { UserActivity } from '../models/UserActivity.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_nic_key';

// Interface to represent our request with user
export interface AuthRequest extends Request {
  user?: User;
}

export const recordActivity = async (userId: number) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Find or create the activity row for today
    const [activity, created] = await UserActivity.findOrCreate({
      where: { userId, date: dateStr },
      defaults: { count: 1 }
    });

    if (!created) {
      activity.count += 1;
      await activity.save();
    }
  } catch (error) {
    console.error('Error recording user activity:', error);
  }
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(418).json({ message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found or session expired.' });
    }

    req.user = user;

    // Record activity asynchronously so we do not block request fulfillment
    recordActivity(user.id).catch(err => console.error('Activity recording failed:', err));

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
export { JWT_SECRET };
