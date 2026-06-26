import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';
import { User } from './User.js';

export class ReferralRequest extends Model {
  declare id: number;
  declare seekerId: number;
  declare alumniId: number;
  declare targetRole: string;
  declare location: string;
  declare timeline: string;
  declare pitchMessage: string;
  declare status: 'pending' | 'accepted' | 'declined' | 'hired' | 'referred' | 'info';
  declare rating?: number;
  declare ratingFeedback?: string;
}

ReferralRequest.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    seekerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    alumniId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    targetRole: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Remote',
    },
    timeline: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pitchMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'accepted', 'declined', 'hired', 'referred', 'info']],
      },
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    ratingFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ReferralRequest',
  }
);

// Define associations
User.hasMany(ReferralRequest, { foreignKey: 'seekerId', as: 'sentRequests' });
User.hasMany(ReferralRequest, { foreignKey: 'alumniId', as: 'receivedRequests' });
ReferralRequest.belongsTo(User, { foreignKey: 'seekerId', as: 'seeker' });
ReferralRequest.belongsTo(User, { foreignKey: 'alumniId', as: 'alumni' });
