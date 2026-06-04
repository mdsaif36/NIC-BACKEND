import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_nic_key';

// Interface to represent our request with user
export interface AuthRequest extends Request {
  user?: User;
}

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
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
export { JWT_SECRET };
