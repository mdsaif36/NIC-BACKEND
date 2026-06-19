import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

// ─── Role-Based Access Control (RBAC) ─────────────────────────────────────────
// Sits after the `authenticate` middleware. Checks req.user.role against the
// allowed roles list. Returns 403 if role is not permitted.
//
// Usage:
//   router.post('/some-route', authenticate, requireRole('alumni'), handler)
//   router.get('/admin-route', authenticate, requireAdmin, handler)
//
// Admin role is reserved for future use. Add it to User.role enum when needed.
// ──────────────────────────────────────────────────────────────────────────────

type UserRole = 'seeker' | 'alumni' | 'admin';

/**
 * Generic RBAC — require one or more of the listed roles.
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(user.role as UserRole)) {
      return res.status(403).json({
        message: `Access denied. This endpoint requires one of: ${roles.join(', ')}.`,
        yourRole: user.role,
      });
    }

    next();
  };
};

/** Shorthand: alumni + admin can access */
export const requireAlumni = requireRole('alumni', 'admin');

/** Shorthand: seeker + admin can access */
export const requireSeeker = requireRole('seeker', 'admin');

/** Shorthand: admin-only */
export const requireAdmin = requireRole('admin');

/** Both roles — any authenticated user can access (still must be authenticated) */
export const requireAnyRole = requireRole('seeker', 'alumni', 'admin');
