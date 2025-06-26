"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface CSVExportProps {
  logs: any[];
  filename?: string;
}

export default function CSVExport({ logs, filename = 'production-logs' }: CSVExportProps) {
  const generateCSV = (logs: any[]) => {
    const headers = ['Date', 'Bread Type', 'Quantity', 'Shift', 'Time', 'Notes'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleDateString(),
      log.bread_types?.name || log.bread_type_id,
      log.quantity,
      log.shift.charAt(0).toUpperCase() + log.shift.slice(1),
      new Date(log.created_at).toLocaleTimeString(),
      log.feedback || '',
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    return csvContent;
  };

  const handleExport = async () => {
    try {
      const csvContent = generateCSV(logs);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (logs.length === 0) {
    return null;
  }

  return (
    <Button 
      onClick={handleExport}
      variant="outline"
      size="sm"
      className="w-full sm:w-auto"
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV ({logs.length} entries)
    </Button>
  );
} 