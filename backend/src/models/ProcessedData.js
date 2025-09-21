import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ProcessedData = sequelize.define('ProcessedData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  data_file_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'data_files',
      key: 'id'
    }
  },
  customer_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  company_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  total_spent: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  engagement_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  last_interaction_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purchase_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  support_tickets: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  contract_months_left: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive', 'Churned'),
    allowNull: true,
    defaultValue: 'Active'
  },
  // ML Generated Fields
  segment: {
    type: DataTypes.STRING,
    allowNull: true
  },
  churn_probability: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  upsell_score: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  risk_level: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    allowNull: true,
    defaultValue: 'Low'
  },
  // Raw data from upload
  raw_data: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'processed_data',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'customer_id']
    },
    {
      fields: ['segment']
    },
    {
      fields: ['churn_probability']
    },
    {
      fields: ['status']
    }
  ]
});

export default ProcessedData;
