'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/ToastProvider';
import { ReportSummary, ShiftSummary } from '@/lib/reports/queries';
import { exportToPDF, exportToCSV, ExportOptions } from '@/lib/reports/export';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';

interface ExportButtonsProps {
  reportData: ReportSummary | ShiftSummary;
  elementId: string;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
}

export default function ExportButtons({
  reportData,
  elementId,
  title,
  subtitle,
  disabled = false
}: ExportButtonsProps) {
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const toast = useToast();

  const handlePDFExport = async () => {
    try {
      setExportingPDF(true);
      
      const options: ExportOptions = {
        title: title || 'HomeBake Report',
        subtitle: subtitle || 'Business Performance Report',
        filename: `homebake-report-${new Date().toISOString().split('T')[0]}.pdf`
      };

      await exportToPDF(elementId, reportData, options);
      
      toast.success('PDF report exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleCSVExport = () => {
    try {
      setExportingCSV(true);
      
      const options: ExportOptions = {
        filename: `homebake-report-${new Date().toISOString().split('T')[0]}.csv`
      };

      exportToCSV(reportData, options);
      
      toast.success('CSV report exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV. Please try again.');
    } finally {
      setExportingCSV(false);
    }
  };

  const isLoading = exportingPDF || exportingCSV;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        onClick={handlePDFExport}
        disabled={disabled || isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {exportingPDF ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {exportingPDF ? 'Exporting...' : 'Export PDF'}
      </Button>

      <Button
        onClick={handleCSVExport}
        disabled={disabled || isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {exportingCSV ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        {exportingCSV ? 'Exporting...' : 'Export CSV'}
      </Button>

      {isLoading && (
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing export...
        </span>
      )}
    </div>
  );
}

// Alternative component for multiple export options
export function ExportDropdown({
  reportData,
  elementId,
  title,
  subtitle,
  disabled = false
}: ExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const toast = useToast();

  const handlePDFExport = async () => {
    try {
      setExportingPDF(true);
      setIsOpen(false);
      
      const options: ExportOptions = {
        title: title || 'HomeBake Report',
        subtitle: subtitle || 'Business Performance Report',
        filename: `homebake-report-${new Date().toISOString().split('T')[0]}.pdf`
      };

      await exportToPDF(elementId, reportData, options);
      
      toast.success('PDF report exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleCSVExport = () => {
    try {
      setExportingCSV(true);
      setIsOpen(false);
      
      const options: ExportOptions = {
        filename: `homebake-report-${new Date().toISOString().split('T')[0]}.csv`
      };

      exportToCSV(reportData, options);
      
      toast.success('CSV report exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV. Please try again.');
    } finally {
      setExportingCSV(false);
    }
  };

  const isLoading = exportingPDF || exportingCSV;

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export Report
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              onClick={handlePDFExport}
              disabled={isLoading}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              {exportingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {exportingPDF ? 'Exporting PDF...' : 'Export as PDF'}
            </button>
            <button
              onClick={handleCSVExport}
              disabled={isLoading}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              {exportingCSV ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {exportingCSV ? 'Exporting CSV...' : 'Export as CSV'}
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}