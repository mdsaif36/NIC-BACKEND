import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';
import { User } from './User.js';

// ─── AuditLog Model ────────────────────────────────────────────────────────────
// Tracks every critical action on the platform.
// Used for debugging, dispute resolution, and future analytics dashboards.
//
// Action vocabulary (extend as needed):
//   REFERRAL_REQUESTED, REFERRAL_ACCEPTED, REFERRAL_DECLINED, REFERRAL_REFERRED
//   MESSAGE_SENT, MEETING_SCHEDULED
//   RESUME_UPLOADED, RESUME_VIEWED
//   PROFILE_UPDATED
//   OTP_SENT, OTP_VERIFIED
//   LOGIN, SIGNUP
// ──────────────────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'REFERRAL_REQUESTED'
  | 'REFERRAL_ACCEPTED'
  | 'REFERRAL_DECLINED'
  | 'REFERRAL_REFERRED'
  | 'REFERRAL_INFO_REQUESTED'
  | 'MESSAGE_SENT'
  | 'MEETING_SCHEDULED'
  | 'RESUME_UPLOADED'
  | 'RESUME_VIEWED'
  | 'PROFILE_UPDATED'
  | 'OTP_SENT'
  | 'OTP_VERIFIED'
  | 'LOGIN'
  | 'SIGNUP'
  | 'REFERRAL_RATED';

export class AuditLog extends Model {
  declare id: number;
  declare userId: number;
  declare action: AuditAction;
  /** The type of entity involved, e.g. 'ReferralRequest', 'Message', 'User' */
  declare entityType?: string;
  /** The ID of the entity involved */
  declare entityId?: number;
  /** Flexible JSON blob for extra context */
  declare metadata?: any;
  /** Requester IP for security forensics */
  declare ipAddress?: string;
  declare readonly createdAt: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' },
    },
    action: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('metadata');
        return raw ? JSON.parse(raw) : null;
      },
      set(val: any) {
        this.setDataValue('metadata', val ? JSON.stringify(val) : null);
      },
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    updatedAt: false, // Audit logs are immutable — no updates
    indexes: [
      { fields: ['userId'] },
      { fields: ['action'] },
      { fields: ['createdAt'] },
    ],
  }
);

// Associations
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
