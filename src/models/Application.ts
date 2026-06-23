import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';
import { User } from './User.js';
import { ReferralPost } from './ReferralPost.js';

export class Application extends Model {
  declare id: number;
  declare postId: number;
  declare seekerId: number;
  declare pitch: string;
  declare highlightProjectUrl?: string;
  declare customResumeUrl?: string;
  declare status: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Application.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: ReferralPost, key: 'id' },
    },
    seekerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' },
    },
    pitch: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    highlightProjectUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customResumeUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Pending',
    },
  },
  {
    sequelize,
    modelName: 'Application',
  }
);

// Establish table relationships
User.hasMany(Application, { foreignKey: 'seekerId', as: 'applications' });
Application.belongsTo(User, { foreignKey: 'seekerId', as: 'seeker' });

ReferralPost.hasMany(Application, { foreignKey: 'postId', as: 'applications' });
Application.belongsTo(ReferralPost, { foreignKey: 'postId', as: 'post' });
