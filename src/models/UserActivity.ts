import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';
import { User } from './User.js';

export class UserActivity extends Model {
  declare id: number;
  declare userId: number;
  declare date: string;
  declare count: number;
}

UserActivity.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    date: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: 'UserActivity',
    tableName: 'UserActivities',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'date'],
      },
    ],
  }
);

// Define associations
User.hasMany(UserActivity, { foreignKey: 'userId', as: 'activities' });
UserActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' });
