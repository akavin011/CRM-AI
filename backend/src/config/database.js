import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Use DATABASE_URL if provided, otherwise construct from individual parameters
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'crm_user'}:${process.env.DB_PASSWORD || 'akavin011'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'crm_database'}`;

console.log('Using DATABASE_URL:', !!process.env.DATABASE_URL);
console.log('Database URL:', databaseUrl.replace(/:[^:@]+@/, ':***@')); // Hide password in logs

const sequelize = new Sequelize(databaseUrl, {
  logging: false, // Disable logging for now
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export default sequelize;
