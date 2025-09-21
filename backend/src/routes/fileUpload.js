import express from 'express';
import { upload, FileUploadService } from '../services/fileUploadService.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import DataFile from '../models/DataFile.js';
import ProcessedData from '../models/ProcessedData.js';
import fs from 'fs';

const router = express.Router();

// @route   POST /api/upload
// @desc    Upload CSV/JSON file
// @access  Private
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const dataFile = await FileUploadService.uploadFile(req.user.userId, req.file);
    
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileId: dataFile.id,
        filename: dataFile.original_name,
        status: dataFile.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/upload/:fileId/process
// @desc    Process uploaded file
// @access  Private
router.post('/:fileId/process', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await FileUploadService.processFile(fileId, req.user.userId);
    
    res.json({
      success: true,
      message: 'File processed successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/upload/files
// @desc    Get user's uploaded files
// @access  Private
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const files = await FileUploadService.getUserFiles(req.user.userId);
    
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/upload/data
// @desc    Get user's processed data
// @access  Private
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await FileUploadService.getUserProcessedData(req.user.userId, { limit, offset });
    
    res.json({
      success: true,
      data: {
        processedData: result.rows,
        total: result.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   DELETE /api/upload/:fileId
// @desc    Delete uploaded file
// @access  Private
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Find the file
    const dataFile = await DataFile.findByPk(fileId);
    if (!dataFile || dataFile.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Delete physical file
    if (fs.existsSync(dataFile.file_path)) {
      fs.unlinkSync(dataFile.file_path);
    }

    // Delete processed data from PostgreSQL
    await ProcessedData.destroy({
      where: { data_file_id: fileId }
    });

    // Delete processed data from ChromaDB
    try {
      const { chromaDBService } = await import('../services/chromadbService.js');
      await chromaDBService.deleteUserData(req.user.userId);
    } catch (chromaError) {
      console.warn('ChromaDB deletion failed:', chromaError.message);
    }

    // Delete file record
    await dataFile.destroy();
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/upload/:fileId/preview
// @desc    Preview file content and column mapping
// @access  Private
router.get('/:fileId/preview', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const dataFile = await DataFile.findByPk(fileId);
    
    if (!dataFile || dataFile.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Read first few rows for preview
    const fs = require('fs');
    const csv = require('csv-parser');
    const previewData = [];
    let rowCount = 0;

    if (dataFile.file_type === '.csv') {
      fs.createReadStream(dataFile.file_path)
        .pipe(csv())
        .on('data', (row) => {
          if (rowCount < 5) { // First 5 rows
            previewData.push(row);
            rowCount++;
          }
        })
        .on('end', () => {
          res.json({
            success: true,
            data: {
              file: dataFile,
              preview: previewData,
              columnMapping: dataFile.column_mapping
            }
          });
        });
    } else {
      res.json({
        success: true,
        data: {
          file: dataFile,
          preview: [],
          columnMapping: dataFile.column_mapping
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
