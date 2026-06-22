import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';
import { User } from './User.js';

// ─── Notification Model ────────────────────────────────────────────────────────
// Persists in-app notifications so users can review them after reconnecting.
// Socket.IO delivers them live; this table makes them durable.
//
// Notification types and suggested icons (frontend can map these):
//   referral_received    → 📬 (new request from seeker)
//   referral_accepted    → ✅
//   referral_declined    → ❌
//   referral_referred    → 🎉 (fully referred!)
//   message_received     → 💬
//   meeting_scheduled    → 📅
//   credit_reset         → 🔄 (monthly credits refreshed)
//   system               → 🔔 (admin announcements)
// ──────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'referral_received'
  | 'referral_accepted'
  | 'referral_declined'
  | 'referral_referred'
  | 'referral_info'
  | 'message_received'
  | 'meeting_scheduled'
  | 'credit_reset'
  | 'system'
  | 'referral_rated'
  | 'new_referral';

export class Notification extends Model {
  declare id: number;
  declare userId: number;       // recipient
  declare type: NotificationType;
  declare title: string;
  declare message: string;
  declare isRead: boolean;
  /** Link to take the user to when clicked, e.g. /dashboard?tab=inbox */
  declare actionUrl?: string;
  /** Extra context JSON — e.g. { requestId: 12, seekerName: 'Arjun' } */
  declare metadata?: any;
  declare readonly createdAt: Date;
}

Notification.init(
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
    type: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    actionUrl: {
      type: DataTypes.STRING(512),
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
  },
  {
    sequelize,
    modelName: 'Notification',
    updatedAt: false,
    indexes: [
      { fields: ['userId', 'isRead'] },
      { fields: ['createdAt'] },
    ],
  }
);

// Associations
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'recipient' });
