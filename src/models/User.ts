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
  declare targetRole?: string;
  declare targetCompanies?: string[];
  declare skills?: string[];
  declare skillDetails?: any;
  declare githubUrl?: string;
  declare linkedinUrl?: string;
  declare resumeName?: string;
  declare resumeUploaded: boolean;
  declare resumesHistory?: any[];
  declare referralsSentCount: number;
  declare availability: string;
  declare responseRate: string;
  declare responseSpeed: string;
  declare successRate: string;
  declare companyEmail?: string;
  declare isEmailVerified: boolean;
  declare isLinkedinVerified: boolean;
  declare isAdminVerified: boolean;
  declare verifiedAt?: Date;
  declare employeeScreenshot?: string;
  declare companyEmailOtp?: string;
  declare companyEmailOtpExpires?: Date;
  declare trustScore: number;
  declare verificationLevel: 'Unverified' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  declare monthlyReferralLimit: number;
  declare referralCreditsRemaining: number;
  declare lastCreditReset?: Date;
  declare projects?: string[];
  declare canHelpWith?: string[];
  declare experience?: string;
  declare successStories?: any[];
  declare phone?: string;
  declare isPrivateProfile: boolean;
  declare hideEmail: boolean;
  declare hidePhone: boolean;
  declare hideLinkedIn: boolean;
  declare hideCompanyEmail: boolean;
  declare careerIntelligence?: any;
  declare resetToken?: string;
  declare resetTokenExpiry?: Date;
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
    targetRole: {
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
    resumesHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('resumesHistory');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val: any[]) {
        this.setDataValue('resumesHistory', val ? JSON.stringify(val) : JSON.stringify([]));
      },
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
    companyEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isLinkedinVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isAdminVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    employeeScreenshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    companyEmailOtp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    companyEmailOtpExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    monthlyReferralLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
    referralCreditsRemaining: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
    lastCreditReset: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    projects: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('projects');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val: string[]) {
        this.setDataValue('projects', val ? JSON.stringify(val) : JSON.stringify([]));
      },
    },
    canHelpWith: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('canHelpWith');
        return rawValue ? JSON.parse(rawValue) : ['Referrals', 'Resume Review', 'Mock Interviews', 'Career Guidance'];
      },
      set(val: string[]) {
        this.setDataValue('canHelpWith', val ? JSON.stringify(val) : null);
      },
    },
    experience: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '3 Years',
    },
    successStories: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('successStories');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val: any[]) {
        this.setDataValue('successStories', val ? JSON.stringify(val) : JSON.stringify([]));
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isPrivateProfile: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hideEmail: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hidePhone: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hideLinkedIn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hideCompanyEmail: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    careerIntelligence: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('careerIntelligence');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(val: any) {
        this.setDataValue('careerIntelligence', val ? JSON.stringify(val) : null);
      },
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    trustScore: {
      type: DataTypes.VIRTUAL,
      get() {
        let score = 0;
        if (this.getDataValue('isEmailVerified')) score += 30;
        if (this.getDataValue('isLinkedinVerified')) score += 25;
        if (this.getDataValue('isAdminVerified')) score += 25;
        const referrals = this.getDataValue('referralsSentCount') || 0;
        score += Math.min(20, referrals * 2);
        return score;
      }
    },
    verificationLevel: {
      type: DataTypes.VIRTUAL,
      get() {
        const isEmail = this.getDataValue('isEmailVerified');
        const isLinkedin = this.getDataValue('isLinkedinVerified');
        const isAdmin = this.getDataValue('isAdminVerified');
        const referrals = this.getDataValue('referralsSentCount') || 0;

        if (referrals >= 10 && isEmail && isLinkedin && isAdmin) {
          return 'Platinum';
        }
        if (isEmail && isLinkedin && isAdmin) {
          return 'Gold';
        }
        if (isEmail && isLinkedin) {
          return 'Silver';
        }
        if (isEmail) {
          return 'Bronze';
        }
        return 'Unverified';
      }
    },
  },
  {
    sequelize,
    modelName: 'User',
  }
);
