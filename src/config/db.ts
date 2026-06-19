import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Database Configuration ────────────────────────────────────────────────────
// Supports both DATABASE_URL (PostgreSQL) and local SQLite.
//
// To migrate from SQLite → PostgreSQL:
//   1. Run: npm install pg pg-hstore
//   2. Set env: DATABASE_URL=postgresql://user:pass@host:5432/nextincampus
//   3. Restart the server — all Sequelize models work unchanged.
//
// For self-hosted Docker:
//   DATABASE_URL=postgresql://nic_user:nic_pass@postgres:5432/nextincampus
//
// DB_SSL=true adds SSL for managed PaaS providers (Supabase, Neon, Railway).
// ──────────────────────────────────────────────────────────────────────────────

const databaseUrl = process.env.DATABASE_URL;
const isPostgres = databaseUrl && databaseUrl.startsWith('postgres');

let sequelize: Sequelize;

if (isPostgres) {
  // ── PostgreSQL ──────────────────────────────────────────────────────────────
  sequelize = new Sequelize(databaseUrl as string, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : false,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  });

  console.log('🐘 Database: PostgreSQL');
} else {
  // ── SQLite (local dev fallback) ─────────────────────────────────────────────
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: false,
  });

  console.log('📦 Database: SQLite (local dev — set DATABASE_URL to use PostgreSQL)');
}

export default sequelize;
