import { Request, Response, NextFunction } from 'express';
import { AuditLog, AuditAction } from '../models/AuditLog.js';
import { AuthRequest } from './auth.js';

// ─── Audit Logging Middleware & Helper ────────────────────────────────────────
// Call logAudit() inside route handlers after critical operations complete.
// Fire-and-forget — does NOT block the HTTP response.
//
// Usage example in a route:
//   await request.save();
//   logAudit(req, 'REFERRAL_REQUESTED', 'ReferralRequest', request.id, {
//     seekerId: seeker.id,
//     alumniId,
//   });
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Helper to persist an audit log entry.
 * Safe to call without await — errors are caught and logged to console only.
 */
export const logAudit = (
  req: AuthRequest,
  action: AuditAction,
  entityType?: string,
  entityId?: number,
  metadata?: Record<string, any>
): void => {
  const userId = req.user?.id;
  if (!userId) return; // no-op for unauthenticated contexts

  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  AuditLog.create({
    userId,
    action,
    entityType: entityType ?? undefined,
    entityId: entityId ?? undefined,
    metadata: metadata ?? undefined,
    ipAddress,
  }).catch((err) => {
    console.error('[AuditLog] Failed to write audit entry:', err.message);
  });
};

/**
 * Express route middleware version — logs the action automatically
 * at the start of the request. Useful for simple read-only auditing.
 * For write operations, prefer the `logAudit()` helper after data mutation.
 */
export const auditMiddleware = (action: AuditAction) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    logAudit(req, action);
    next();
  };
};
