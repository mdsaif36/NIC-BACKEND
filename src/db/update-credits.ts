import { User } from '../models/User.js';
import sequelize from '../config/db.js';

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');
    
    // Update all users' monthly limit and remaining credits to 10
    const [updatedCount] = await User.update(
      {
        monthlyReferralLimit: 10,
        referralCreditsRemaining: 10
      },
      {
        where: {}
      }
    );
    console.log(`Successfully updated ${updatedCount} users in the database to 10 credits.`);
  } catch (error: any) {
    console.error('Failed to update credits:', error.message);
  } finally {
    await sequelize.close();
  }
}

run();
