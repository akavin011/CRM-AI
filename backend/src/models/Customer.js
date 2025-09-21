import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: true
  },
  total_spent: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  last_purchase: {
    type: DataTypes.DATE,
    allowNull: true
  },
  engagement_score: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    validate: {
      min: 0,
      max: 100
    }
  },
  churn_probability: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.1,
    validate: {
      min: 0,
      max: 1
    }
  },
  segment: {
    type: DataTypes.STRING,
    defaultValue: 'Standard',
    validate: {
      isIn: [['High Value', 'Medium Value', 'Low Value', 'Standard', 'At Risk']]
    }
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Active',
    validate: {
      isIn: [['Active', 'Inactive', 'Prospect', 'Churned']]
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'customers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Customer;
