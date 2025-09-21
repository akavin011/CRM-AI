import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DataFile = sequelize.define('DataFile', {
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
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  original_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  file_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('uploaded', 'processing', 'processed', 'error'),
    defaultValue: 'uploaded'
  },
  column_mapping: {
    type: DataTypes.JSON,
    allowNull: true
  },
  processing_errors: {
    type: DataTypes.JSON,
    allowNull: true
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  row_count: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  validation_summary: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'data_files',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default DataFile;
