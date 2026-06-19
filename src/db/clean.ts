import sequelize from '../config/db.js';

async function clean() {
  try {
    await sequelize.authenticate();
    console.log('🧹 Cleaner: Connected to database.');

    // Recreate all tables cleanly with force: true
    await sequelize.sync({ force: true });
    console.log('✅ Cleaner: All database tables successfully force-cleared and reset to empty.');
  } catch (error: any) {
    console.error('❌ Cleaner: Failed to clean database:', error.message);
  } finally {
    await sequelize.close();
  }
}

clean();
