import sequelize from './database.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Interaction from '../models/Interaction.js';
import DataFile from '../models/DataFile.js';
import ProcessedData from '../models/ProcessedData.js';

// Define associations
Customer.hasMany(Interaction, { foreignKey: 'customer_id', as: 'interactions' });
Interaction.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });


User.hasMany(DataFile, { foreignKey: 'user_id', as: 'dataFiles' });
DataFile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(ProcessedData, { foreignKey: 'user_id', as: 'processedData' });
ProcessedData.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

DataFile.hasMany(ProcessedData, { foreignKey: 'data_file_id', as: 'processedData' });
ProcessedData.belongsTo(DataFile, { foreignKey: 'data_file_id', as: 'dataFile' });

export const initializeDatabase = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync all models
    await sequelize.sync({ force: false }); // Set to true to recreate tables
    console.log('✅ Database tables synchronized successfully.');

    // Check if we need to seed data
    const customerCount = await Customer.count();
    const userCount = await User.count();
    
    if (customerCount === 0) {
      await seedDatabase();
    }
    
    if (userCount === 0) {
      await seedUsers();
    }

    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database with sample data...');

    // Create sample customers
    const customers = await Customer.bulkCreate([
      {
        name: 'John Smith',
        email: 'john.smith@techcorp.com',
        phone: '+1-555-0123',
        company: 'TechCorp Inc',
        industry: 'Technology',
        total_spent: 25000.00,
        last_purchase: new Date('2024-01-15'),
        engagement_score: 85,
        churn_probability: 0.15,
        segment: 'High Value',
        status: 'Active'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.j@innovate.com',
        phone: '+1-555-0124',
        company: 'Innovate Solutions',
        industry: 'Consulting',
        total_spent: 15000.00,
        last_purchase: new Date('2024-01-10'),
        engagement_score: 72,
        churn_probability: 0.25,
        segment: 'Medium Value',
        status: 'Active'
      },
      {
        name: 'Mike Wilson',
        email: 'mike.w@startup.com',
        phone: '+1-555-0125',
        company: 'StartupXYZ',
        industry: 'Startup',
        total_spent: 5000.00,
        last_purchase: new Date('2023-12-20'),
        engagement_score: 45,
        churn_probability: 0.65,
        segment: 'At Risk',
        status: 'Active'
      },
      {
        name: 'Emily Davis',
        email: 'emily.d@enterprise.com',
        phone: '+1-555-0126',
        company: 'Enterprise Corp',
        industry: 'Enterprise',
        total_spent: 75000.00,
        last_purchase: new Date('2024-01-20'),
        engagement_score: 95,
        churn_probability: 0.05,
        segment: 'High Value',
        status: 'Active'
      },
      {
        name: 'David Brown',
        email: 'david.b@retail.com',
        phone: '+1-555-0127',
        company: 'Retail Plus',
        industry: 'Retail',
        total_spent: 12000.00,
        last_purchase: new Date('2024-01-05'),
        engagement_score: 60,
        churn_probability: 0.35,
        segment: 'Medium Value',
        status: 'Active'
      },
      {
        name: 'Lisa Garcia',
        email: 'lisa.g@healthcare.com',
        phone: '+1-555-0128',
        company: 'HealthCare Solutions',
        industry: 'Healthcare',
        total_spent: 30000.00,
        last_purchase: new Date('2024-01-18'),
        engagement_score: 80,
        churn_probability: 0.20,
        segment: 'High Value',
        status: 'Active'
      },
      {
        name: 'Robert Taylor',
        email: 'robert.t@finance.com',
        phone: '+1-555-0129',
        company: 'Finance First',
        industry: 'Finance',
        total_spent: 8000.00,
        last_purchase: new Date('2023-11-30'),
        engagement_score: 30,
        churn_probability: 0.80,
        segment: 'At Risk',
        status: 'Inactive'
      },
      {
        name: 'Jennifer Lee',
        email: 'jennifer.l@education.com',
        phone: '+1-555-0130',
        company: 'EduTech',
        industry: 'Education',
        total_spent: 18000.00,
        last_purchase: new Date('2024-01-12'),
        engagement_score: 70,
        churn_probability: 0.30,
        segment: 'Medium Value',
        status: 'Active'
      },
      {
        name: 'Michael Chen',
        email: 'michael.c@manufacturing.com',
        phone: '+1-555-0131',
        company: 'Manufacturing Co',
        industry: 'Manufacturing',
        total_spent: 45000.00,
        last_purchase: new Date('2024-01-08'),
        engagement_score: 90,
        churn_probability: 0.10,
        segment: 'High Value',
        status: 'Active'
      },
      {
        name: 'Amanda White',
        email: 'amanda.w@logistics.com',
        phone: '+1-555-0132',
        company: 'Logistics Pro',
        industry: 'Logistics',
        total_spent: 22000.00,
        last_purchase: new Date('2024-01-14'),
        engagement_score: 75,
        churn_probability: 0.25,
        segment: 'High Value',
        status: 'Active'
      }
    ]);

    // Create sample interactions
    await Interaction.bulkCreate([
      {
        customer_id: customers[0].id,
        type: 'email',
        subject: 'Product Inquiry',
        description: 'Customer inquired about premium features',
        outcome: 'Positive response, scheduled demo'
      },
      {
        customer_id: customers[1].id,
        type: 'phone',
        subject: 'Support Call',
        description: 'Technical issue with integration',
        outcome: 'Issue resolved, customer satisfied'
      },
      {
        customer_id: customers[2].id,
        type: 'meeting',
        subject: 'Account Review',
        description: 'Quarterly business review meeting',
        outcome: 'Identified upsell opportunities'
      }
    ]);


    console.log('✅ Database seeded successfully with sample data.');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

const seedUsers = async () => {
  try {
    console.log('👤 Seeding users with sample data...');



    console.log('✅ Users seeded successfully.');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  }
};

export default initializeDatabase;
