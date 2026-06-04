import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';

export class User extends Model {
  declare id: number;
  declare email: string;
  declare password?: string;
  declare role: 'seeker' | 'alumni';
  declare name: string;
  declare college: string;
  declare googleId?: string;
  declare githubId?: string;
  declare company?: string;
  declare jobTitle?: string;
  declare bio?: string;
  declare year?: string;
  declare branch?: string;
  declare targetCompanies?: string[];
  declare skills?: string[];
  declare skillDetails?: any;
  declare githubUrl?: string;
  declare linkedinUrl?: string;
  declare resumeName?: string;
  declare resumeUploaded: boolean;
  declare referralsSentCount: number;
  declare availability: string;
  declare responseRate: string;
  declare responseSpeed: string;
  declare successRate: string;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    githubId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['seeker', 'alumni']],
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    college: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    jobTitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    year: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branch: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    targetCompanies: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('targetCompanies');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val: string[]) {
        this.setDataValue('targetCompanies', val ? JSON.stringify(val) : JSON.stringify([]));
      },
    },
    skills: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('skills');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val: string[]) {
        this.setDataValue('skills', val ? JSON.stringify(val) : JSON.stringify([]));
      },
    },
    skillDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('skillDetails');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(val: any) {
        this.setDataValue('skillDetails', val ? JSON.stringify(val) : JSON.stringify({}));
      },
    },
    githubUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    linkedinUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resumeName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resumeUploaded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    referralsSentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    availability: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Available Now',
    },
    responseRate: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '90%',
    },
    responseSpeed: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Within 1 day',
    },
    successRate: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0 referred',
    },
  },
  {
    sequelize,
    modelName: 'User',
  }
);
