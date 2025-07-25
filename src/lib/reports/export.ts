'use client';

// Production-ready export utilities without heavy dependencies
// Replaced jsPDF and html2canvas for better serverless compatibility

import { ReportSummary, ShiftSummary } from './queries';

export interface ExportOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
}

/**
 * Export data to CSV format using native JavaScript
 * More reliable than heavy dependencies in serverless environments
 */
export function exportToCSV(
  reportData: ReportSummary | ShiftSummary,
  options: ExportOptions = {}
): void {
  try {
    let csvData: any[] = [];

    if ('shifts' in reportData) {
      // Multi-shift report
      csvData = reportData.shifts.flatMap(shift => 
        shift.breadTypeBreakdown.map(bread => ({
          Date: shift.date,
          Shift: shift.shift,
          'Bread Type': bread.breadTypeName,
          'Unit Price': bread.breadTypePrice,
          Produced: bread.produced,
          Sold: bread.sold,
          Revenue: bread.revenue,
          Leftover: bread.leftover,
          Discounts: bread.discounts
        }))
      );
    } else {
      // Single shift report
      csvData = reportData.breadTypeBreakdown.map(bread => ({
        Date: reportData.date,
        Shift: reportData.shift,
        'Bread Type': bread.breadTypeName,
        'Unit Price': bread.breadTypePrice,
        Produced: bread.produced,
        Sold: bread.sold,
        Revenue: bread.revenue,
        Leftover: bread.leftover,
        Discounts: bread.discounts
      }));
    }

    // Convert to CSV manually for better control
    const csv = convertToCSV(csvData);
    const filename = options.filename || `homebake-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    downloadFile(csv, filename, 'text/csv');
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export CSV');
  }
}

/**
 * Export report as formatted text
 * Production-ready alternative to PDF export
 */
export function exportToText(
  reportData: ReportSummary | ShiftSummary,
  options: ExportOptions = {}
): void {
  try {
    const title = options.title || 'HomeBake Report';
    const subtitle = options.subtitle || '';
    const timestamp = new Date().toLocaleString();

    let textContent = '';
    
    // Header
    textContent += `${title}\n`;
    textContent += '='.repeat(title.length) + '\n\n';
    
    if (subtitle) {
      textContent += `${subtitle}\n\n`;
    }
    
    textContent += `Generated: ${timestamp}\n\n`;

    // Report data
    if ('shifts' in reportData) {
             // Multi-shift report
       textContent += `Total Revenue: ₦${reportData.totalRevenue.toLocaleString()}\n`;
       textContent += `Total Production: ${reportData.totalProduced} items\n`;
       textContent += `Total Sold: ${reportData.totalSold} items\n\n`;

       reportData.shifts.forEach(shift => {
         textContent += `${shift.shift.toUpperCase()} SHIFT - ${shift.date}\n`;
         textContent += '-'.repeat(30) + '\n';
         textContent += `Revenue: ₦${shift.totalRevenue.toLocaleString()}\n`;
         textContent += `Production: ${shift.totalProduced} items\n`;
         textContent += `Sold: ${shift.totalSold} items\n\n`;

        textContent += 'Bread Type Breakdown:\n';
        shift.breadTypeBreakdown.forEach(bread => {
          textContent += `  ${bread.breadTypeName}: `;
          textContent += `Produced: ${bread.produced}, `;
          textContent += `Sold: ${bread.sold}, `;
          textContent += `Revenue: ₦${bread.revenue.toLocaleString()}\n`;
        });
        textContent += '\n';
      });
    } else {
             // Single shift report
       textContent += `${reportData.shift.toUpperCase()} SHIFT - ${reportData.date}\n`;
       textContent += '-'.repeat(30) + '\n';
       textContent += `Revenue: ₦${reportData.totalRevenue.toLocaleString()}\n`;
       textContent += `Production: ${reportData.totalProduced} items\n`;
       textContent += `Sold: ${reportData.totalSold} items\n\n`;

      textContent += 'Bread Type Breakdown:\n';
      reportData.breadTypeBreakdown.forEach(bread => {
        textContent += `  ${bread.breadTypeName}: `;
        textContent += `Produced: ${bread.produced}, `;
        textContent += `Sold: ${bread.sold}, `;
        textContent += `Revenue: ₦${bread.revenue.toLocaleString()}\n`;
      });
    }

    textContent += '\n---\n';
    textContent += 'Generated by HomeBake Management System\n';

    const filename = options.filename || `homebake-report-${new Date().toISOString().split('T')[0]}.txt`;
    downloadFile(textContent, filename, 'text/plain');

  } catch (error) {
    console.error('Error exporting to text:', error);
    throw new Error('Failed to export text');
  }
}

/**
 * Export report as JSON
 * Useful for data backup and integration with other systems
 */
export function exportToJSON(
  reportData: ReportSummary | ShiftSummary,
  options: ExportOptions = {}
): void {
  try {
    const exportData = {
      metadata: {
        title: options.title || 'HomeBake Report',
        subtitle: options.subtitle || '',
        generatedAt: new Date().toISOString(),
        version: '2.0.0'
      },
      data: reportData
    };

    const json = JSON.stringify(exportData, null, 2);
    const filename = options.filename || `homebake-report-${new Date().toISOString().split('T')[0]}.json`;
    
    downloadFile(json, filename, 'application/json');
  } catch (error) {
    console.error('Error exporting to JSON:', error);
    throw new Error('Failed to export JSON');
  }
}

/**
 * Print the current report
 * Browser-native printing as alternative to PDF generation
 */
export function printReport(elementId: string, options: ExportOptions = {}): void {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found for printing');
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }

    const title = options.title || 'HomeBake Report';
    const timestamp = new Date().toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #ff6b35;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #ff6b35;
              margin: 0;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f8f9fa;
            }
            .metric {
              margin: 10px 0;
              padding: 10px;
              background-color: #f8f9fa;
              border-radius: 5px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>Generated on ${timestamp}</p>
          </div>
          ${element.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

  } catch (error) {
    console.error('Error printing report:', error);
    throw new Error('Failed to print report');
  }
}

// Helper function to convert array of objects to CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

// Helper function to download files
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

// Legacy PDF export function - now redirects to print
export async function exportToPDF(
  elementId: string, 
  reportData: ReportSummary | ShiftSummary,
  options: ExportOptions = {}
): Promise<void> {
  console.warn('PDF export has been replaced with browser printing for better compatibility');
  printReport(elementId, options);
}