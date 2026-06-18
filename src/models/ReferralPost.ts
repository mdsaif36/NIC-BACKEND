import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';
import { User } from './User.js';

export class ReferralPost extends Model {
  declare id: number;
  declare alumniId: number;
  declare company: string;
  declare role: string;
  declare location: string;
  declare jobType: string; // 'Full-time' | 'Internship' | 'Contract'
  declare domain: string;  // 'Engineering' | 'Product' | 'Design' | 'Data' | 'Marketing' | ...
  declare skills: string[];
  declare description: string;
  declare deadline: string;
  declare slots: number;    // how many referrals alumni can give
  declare isActive: boolean;
  declare viewCount: number;
  declare applyCount: number;
}

ReferralPost.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    alumniId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' },
    },
    company: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Remote',
    },
    jobType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Full-time',
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Engineering',
    },
    skills: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('skills');
        return raw ? JSON.parse(raw) : [];
      },
      set(val: string[]) {
        this.setDataValue('skills', val ? JSON.stringify(val) : JSON.stringify([]));
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    deadline: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    slots: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    applyCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'ReferralPost',
  }
);

// Associations
User.hasMany(ReferralPost, { foreignKey: 'alumniId', as: 'referralPosts' });
ReferralPost.belongsTo(User, { foreignKey: 'alumniId', as: 'alumni' });
