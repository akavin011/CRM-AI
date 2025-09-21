// Export service for downloading data in various formats
export class ExportService {
  // Export data as CSV
  static exportToCSV(data, filename = 'export.csv') {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      // Headers
      headers.join(','),
      // Data rows
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    this.downloadFile(csvContent, filename, 'text/csv');
  }

  // Export data as JSON
  static exportToJSON(data, filename = 'export.json') {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, filename, 'application/json');
  }

  // Export data as Excel (XLSX)
  static exportToExcel(data, filename = 'export.xlsx') {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // For now, export as CSV since we don't have XLSX library
    // In production, you would use a library like 'xlsx'
    this.exportToCSV(data, filename.replace('.xlsx', '.csv'));
  }

  // Export customer data with specific fields
  static exportCustomerData(customers, format = 'csv') {
    if (!customers || customers.length === 0) {
      console.warn('No customer data to export');
      return;
    }

    // Map customer data to export format
    const exportData = customers.map(customer => ({
      'Customer ID': customer.customer_id || customer.id,
      'Company Name': customer.company_name,
      'Industry': customer.industry,
      'Location': customer.location,
      'Total Spent': customer.total_spent,
      'Engagement Score': customer.engagement_score,
      'Status': customer.status,
      'Last Interaction': customer.last_interaction_date,
      'Purchase Count': customer.purchase_count,
      'Support Tickets': customer.support_tickets,
      'Segment': customer.segment,
      'Churn Probability': customer.churn_probability,
      'Upsell Score': customer.upsell_score,
      'Risk Level': customer.risk_level
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `customers_export_${timestamp}.${format}`;

    switch (format.toLowerCase()) {
      case 'csv':
        this.exportToCSV(exportData, filename);
        break;
      case 'json':
        this.exportToJSON(exportData, filename);
        break;
      case 'xlsx':
        this.exportToExcel(exportData, filename);
        break;
      default:
        console.warn('Unsupported export format:', format);
    }
  }

  // Export analytics data
  static exportAnalyticsData(analytics, format = 'csv') {
    if (!analytics) {
      console.warn('No analytics data to export');
      return;
    }

    const exportData = [
      {
        'Metric': 'Total Customers',
        'Value': analytics.total_customers || 0,
        'Description': 'Number of active customers'
      },
      {
        'Metric': 'Total Revenue',
        'Value': analytics.total_revenue || 0,
        'Description': 'Total revenue generated'
      },
      {
        'Metric': 'Average Engagement',
        'Value': analytics.average_engagement || 0,
        'Description': 'Average customer engagement score'
      },
      {
        'Metric': 'Churn Rate',
        'Value': analytics.churn_rate || 0,
        'Description': 'Monthly churn rate percentage'
      },
      {
        'Metric': 'Active Customers',
        'Value': analytics.active_customers || 0,
        'Description': 'Number of active customers'
      },
      {
        'Metric': 'New Customers This Month',
        'Value': analytics.new_customers_this_month || 0,
        'Description': 'New customers acquired this month'
      }
    ];

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analytics_export_${timestamp}.${format}`;

    switch (format.toLowerCase()) {
      case 'csv':
        this.exportToCSV(exportData, filename);
        break;
      case 'json':
        this.exportToJSON(exportData, filename);
        break;
      default:
        console.warn('Unsupported export format:', format);
    }
  }

  // Helper method to download file
  static downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Export file list
  static exportFileList(files, format = 'csv') {
    if (!files || files.length === 0) {
      console.warn('No files to export');
      return;
    }

    const exportData = files.map(file => ({
      'File Name': file.original_name,
      'File Size': file.size,
      'File Type': file.mime_type,
      'Status': file.status,
      'Upload Date': new Date(file.upload_date).toLocaleDateString(),
      'Row Count': file.row_count || 0,
      'Processing Status': file.status
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `files_export_${timestamp}.${format}`;

    switch (format.toLowerCase()) {
      case 'csv':
        this.exportToCSV(exportData, filename);
        break;
      case 'json':
        this.exportToJSON(exportData, filename);
        break;
      default:
        console.warn('Unsupported export format:', format);
    }
  }
}

export default ExportService;
