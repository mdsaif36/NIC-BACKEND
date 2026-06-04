import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.js';
import { User } from './User.js';

export class Message extends Model {
  declare id: number;
  declare senderId: number;
  declare receiverId: number;
  declare text: string;
  declare isSystem: boolean;
  declare readonly createdAt: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Message',
  }
);

// Define associations
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });
