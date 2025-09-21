import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  File, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Trash2, 
  Eye, 
  RefreshCw, 
  ArrowRight,
  Database,
  BarChart3,
  Settings,
  Upload as CloudUpload,
  FileText,
  Users,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  Plus,
  Filter,
  Search,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.jsx';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ExportService } from '../utils/exportService.js';
import { ValidationService } from '../utils/validation.js';
import { ErrorHandler } from '../utils/errorHandler.js';

const DataUpload = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Processing, 4: Complete
  const [selectedFile, setSelectedFile] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [previewData, setPreviewData] = useState([]);

  // Fetch user's uploaded files
  const { data: files, isLoading: filesLoading, refetch: refetchFiles } = useQuery(
    'userFiles',
    () => fetch('http://localhost:5000/api/upload/files', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(res => res.json()),
    {
      enabled: !!user,
      select: (data) => data.data || []
    }
  );

  // Fetch processed data
  const { data: processedData, isLoading: dataLoading } = useQuery(
    'processedData',
    () => fetch('http://localhost:5000/api/upload/data', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(res => res.json()),
    {
      enabled: !!user,
      select: (data) => data.data || { processedData: [], total: 0 }
    }
  );

  // Upload file mutation
  const uploadMutation = useMutation(async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5000/api/upload/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    } catch (error) {
      const errorInfo = ErrorHandler.handleError(error, { context: 'File upload' });
      throw errorInfo;
    }
  }, {
    onSuccess: (data) => {
      toast.success('File uploaded successfully!');
      setStep(4); // Move to complete step
      refetchFiles(); // Refresh files list
    },
    onError: (errorInfo) => {
      console.error('Upload error:', errorInfo);
      toast.error(errorInfo.userMessage || 'Upload failed');
    }
  });

  // Process file mutation
  const processMutation = useMutation(async (fileId) => {
    const response = await fetch(`http://localhost:5000/api/upload/${fileId}/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Processing failed');
    }

    return response.json();
  });

  // Delete file mutation
  const deleteMutation = useMutation(async (fileId) => {
    const response = await fetch(`http://localhost:5000/api/upload/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Delete failed');
    }

    return response.json();
  });

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file
      const validation = ValidationService.validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['text/csv', 'application/json'],
        allowedExtensions: ['.csv', '.json']
      });

      if (!validation.isValid) {
        toast.error(validation.message);
        return;
      }

      setSelectedFile(file);
      setStep(2);
      
      // Parse CSV for preview
      if (file.type === 'text/csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const csv = e.target.result;
            const lines = csv.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim());
            const data = lines.slice(1, 6).map(line => {
              const values = line.split(',');
              return headers.reduce((obj, header, index) => {
                obj[header] = values[index]?.trim() || '';
                return obj;
              }, {});
            });
            
            // Validate CSV data
            const csvValidation = ValidationService.validateCSVData(data, [
              'customer_id', 'company_name', 'industry'
            ]);
            
            if (!csvValidation.isValid) {
              toast.error(`CSV validation failed: ${csvValidation.message}`);
              return;
            }
            
            if (csvValidation.warnings.length > 0) {
              csvValidation.warnings.forEach(warning => {
                toast.warning(warning);
              });
            }
            
            setPreviewData(data);
          } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, { context: 'CSV parsing' });
            toast.error('Failed to parse CSV file: ' + errorInfo.userMessage);
          }
        };
        reader.readAsText(file);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await uploadMutation.mutateAsync(selectedFile);
      toast.success('File uploaded successfully!');
      setStep(3);
      
      // Process the file immediately
      await handleProcess(result.data.fileId);
      
      // Refresh files list
      refetchFiles();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleProcess = async (fileId) => {
    try {
      const result = await processMutation.mutateAsync(fileId);
      toast.success('File processed successfully!');
      setStep(4);
      
      // Refresh data
      queryClient.invalidateQueries('processedData');
      refetchFiles();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await deleteMutation.mutateAsync(fileId);
      toast.success('File deleted successfully!');
      refetchFiles();
    } catch (error) {
      toast.error(error.message);
    }
  };


  const getFileIcon = (fileType) => {
    return <File className="h-8 w-8 text-blue-500" />;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Upload and manage your customer data for AI-powered analytics
                </p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center text-sm text-gray-500">
                  <Database className="h-4 w-4 mr-2" />
                  {processedData?.total || 0} records
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-2" />
                  {files?.length || 0} files
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {processedData?.total > 0 ? 'Ready' : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Upload Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Upload Data</h2>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-500">Secure Upload</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div
                  {...getRootProps()}
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50 scale-105'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <CloudUpload className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Supports CSV and JSON files up to 10MB
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Choose File
                    </button>
                  </div>
                </div>


                {/* Selected File Preview */}
                {selectedFile && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleUpload}
                        disabled={uploadMutation.isLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {uploadMutation.isLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          'Upload & Process'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* File Management */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">File Management</h2>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => refetchFiles()}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <Filter className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {filesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-500">Loading files...</span>
                  </div>
                ) : files && files.length > 0 ? (
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <FileText className="h-8 w-8 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.original_name}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-xs text-gray-500">{file.size}</p>
                              <p className="text-xs text-gray-500">{file.row_count || 0} records</p>
                              <p className="text-xs text-gray-500">
                                {new Date(file.upload_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            file.status === 'processed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {file.status === 'processed' ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {file.status}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-green-600 transition-colors">
                              <Download className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(file.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 mb-2">No files uploaded</h3>
                    <p className="text-sm text-gray-500">Get started by uploading your first data file</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Data Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Data Preview</h2>
              </div>
              
              <div className="p-6">
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-500">Loading...</span>
                  </div>
                ) : processedData && processedData.processedData && processedData.processedData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Records</span>
                      <span className="text-sm text-gray-500">{processedData.total}</span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {processedData.processedData.slice(0, 5).map((row, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {row.company_name || 'Unknown Company'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {row.industry} • ${row.total_spent?.toLocaleString() || 0}
                              </p>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                row.status === 'Active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {row.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {processedData.processedData.length > 5 && (
                      <p className="text-xs text-gray-500 text-center">
                        ... and {processedData.processedData.length - 5} more records
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 mb-2">No data available</h3>
                    <p className="text-sm text-gray-500">Upload a file to see your data here</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              
              <div className="p-6 space-y-3">
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      if (processedData?.processedData?.length > 0) {
                        ExportService.exportCustomerData(processedData.processedData, 'csv');
                        toast.success('Customer data exported successfully!');
                      } else {
                        toast.error('No data available to export');
                      }
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-3 text-gray-400" />
                      Export Customer Data
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (files?.length > 0) {
                        ExportService.exportFileList(files, 'csv');
                        toast.success('File list exported successfully!');
                      } else {
                        toast.error('No files available to export');
                      }
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-3 text-gray-400" />
                      Export File List
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <BarChart3 className="h-4 w-4 mr-3 text-gray-400" />
                    View Analytics
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <Settings className="h-4 w-4 mr-3 text-gray-400" />
                    Settings
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </motion.div>

            {/* Continue to Dashboard */}
            {processedData && processedData.processedData && processedData.processedData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6"
              >
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze!</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Your data has been processed successfully. Explore insights and analytics.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Continue to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;