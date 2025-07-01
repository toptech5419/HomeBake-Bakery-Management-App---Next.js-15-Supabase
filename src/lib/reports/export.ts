'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { ReportSummary, ShiftSummary } from './queries';

export interface ExportOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
}

export async function exportToPDF(
  elementId: string, 
  reportData: ReportSummary | ShiftSummary,
  options: ExportOptions = {}
): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found for PDF export');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.setFontSize(18);
    pdf.text(options.title || 'HomeBake Report', 20, 20);
    
    if (options.subtitle) {
      pdf.setFontSize(12);
      pdf.text(options.subtitle, 20, 30);
    }

    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 40);

    position = 50;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - position;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 50;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const filename = options.filename || `homebake-report-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export PDF');
  }
}

export function exportToCSV(
  reportData: ReportSummary | ShiftSummary,
  options: ExportOptions = {}
): void {
  try {
    let csvData: any[] = [];

    if ('shifts' in reportData) {
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

    const csv = Papa.unparse(csvData);
    const filename = options.filename || `homebake-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export CSV');
  }
}