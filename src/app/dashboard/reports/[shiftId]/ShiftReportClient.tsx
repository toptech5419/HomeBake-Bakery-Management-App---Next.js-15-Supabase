'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types';
import { ShiftSummary } from '@/lib/reports/queries';
import { useToast } from '@/components/ui/ToastProvider';

import ExportButtons from '@/components/reports/export-buttons';

import { 
  ArrowLeft, 
  Package, 
  ShoppingCart, 
  DollarSign,
  AlertTriangle,
  Target,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface ShiftReportClientProps {
  shiftData: ShiftSummary;
  userRole: UserRole;
  userId: string;
}

export default function ShiftReportClient({
  shiftData
}: ShiftReportClientProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSalesEfficiency = (produced: number, sold: number) => {
    return produced > 0 ? ((sold / produced) * 100).toFixed(1) : '0';
  };

  const bestPerformingBread = shiftData.breadTypeBreakdown.reduce((best, current) => 
    current.revenue > best.revenue ? current : best
  , shiftData.breadTypeBreakdown[0] || { breadTypeName: 'N/A', revenue: 0 });

  return (
    <div className="min-h-screen bg-gray-50" id="shift-report">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/dashboard/reports')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shift Report</h1>
              <p className="text-gray-600 mt-1">
                {formatDate(shiftData.date)} - {shiftData.shift.charAt(0).toUpperCase() + shiftData.shift.slice(1)} Shift
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`border ${
              shiftData.shift === 'morning' 
                ? 'bg-orange-100 text-orange-800 border-orange-200' 
                : 'bg-indigo-100 text-indigo-800 border-indigo-200'
            }`}>
              {shiftData.shift === 'morning' ? '🌅' : '🌙'} {shiftData.shift.charAt(0).toUpperCase() + shiftData.shift.slice(1)}
            </Badge>
                         <ExportButtons
               reportData={shiftData}
               elementId="shift-report"
               title={`HomeBake Shift Report - ${formatDate(shiftData.date)}`}
               subtitle={`${shiftData.shift.charAt(0).toUpperCase() + shiftData.shift.slice(1)} Shift Performance`}
               disabled={false}
             />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
              <div className="p-2 rounded-full bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(shiftData.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500">
                {shiftData.totalDiscounts > 0 && `${formatCurrency(shiftData.totalDiscounts)} in discounts`}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Produced</h3>
              <div className="p-2 rounded-full bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-800">
                {formatNumber(shiftData.totalProduced)}
              </p>
              <p className="text-xs text-gray-500">Loaves baked</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Sold</h3>
              <div className="p-2 rounded-full bg-purple-100">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-purple-800">
                {formatNumber(shiftData.totalSold)}
              </p>
              <p className="text-xs text-gray-500">Loaves sold</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Sales Efficiency</h3>
              <div className="p-2 rounded-full bg-orange-100">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-orange-800">
                {getSalesEfficiency(shiftData.totalProduced, shiftData.totalSold)}%
              </p>
              <p className="text-xs text-gray-500">Sold vs Produced</p>
            </div>
          </Card>
        </div>

        {/* Performance Insights */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>
              <p className="text-sm text-gray-600">Key metrics and analysis for this shift</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Revenue Performance</span>
              </div>
              <p className="text-xs text-gray-600">
                Generated {formatCurrency(shiftData.totalRevenue)} in revenue
                {shiftData.totalRevenue > 25000 ? ' - Excellent performance!' : ' - Room for improvement'}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Best Performer</span>
              </div>
              <p className="text-xs text-gray-600">
                {bestPerformingBread.breadTypeName} was the top seller with {formatCurrency(bestPerformingBread.revenue)} revenue
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`h-4 w-4 ${shiftData.totalLeftover > 10 ? 'text-red-600' : 'text-gray-600'}`} />
                <span className="text-sm font-medium text-gray-700">Leftover Analysis</span>
              </div>
              <p className="text-xs text-gray-600">
                {shiftData.totalLeftover} loaves unsold
                {shiftData.totalLeftover > 10 ? ' - Consider reducing production' : ' - Good inventory management'}
              </p>
            </div>
          </div>
        </Card>

        {/* Bread Type Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Bread Type Performance</h3>
                <p className="text-sm text-gray-600">Detailed breakdown by bread type</p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
              {shiftData.breadTypeBreakdown.length} types
            </Badge>
          </div>

          <div className="space-y-4">
            {shiftData.breadTypeBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Production Data</h3>
                <p className="text-gray-600">No bread types were produced or sold during this shift.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {shiftData.breadTypeBreakdown.map((bread, index) => (
                  <div key={bread.breadTypeId} className="border rounded-lg p-4 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{bread.breadTypeName}</h4>
                          <p className="text-sm text-gray-600">
                            Unit Price: {formatCurrency(bread.breadTypePrice)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-600">Produced</p>
                          <p className="text-lg font-semibold text-blue-600">{bread.produced}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Sold</p>
                          <p className="text-lg font-semibold text-green-600">{bread.sold}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Revenue</p>
                          <p className="text-lg font-semibold text-green-600">
                            {formatCurrency(bread.revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Leftover</p>
                          <p className={`text-lg font-semibold ${bread.leftover > 5 ? 'text-red-600' : 'text-gray-600'}`}>
                            {bread.leftover}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Efficiency</p>
                          <p className="text-lg font-semibold text-orange-600">
                            {getSalesEfficiency(bread.produced, bread.sold)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Sales Progress</span>
                        <span>{bread.sold} of {bread.produced}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${bread.produced > 0 ? (bread.sold / bread.produced) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}