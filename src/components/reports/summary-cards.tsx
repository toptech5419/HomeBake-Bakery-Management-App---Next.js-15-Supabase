'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportSummary } from '@/lib/reports/queries';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  ShoppingCart, 
  AlertTriangle,
  BarChart3,
  Target,
  Clock,
  Award
} from 'lucide-react';

interface SummaryCardsProps {
  reportData: ReportSummary;
  loading?: boolean;
}

export default function SummaryCards({ reportData, loading = false }: SummaryCardsProps) {
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(reportData.totalRevenue),
      icon: DollarSign,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      textColor: 'text-green-800',
      subtitle: `Avg: ${formatCurrency(reportData.averageDailyRevenue)}/day`
    },
    {
      title: 'Total Produced',
      value: formatNumber(reportData.totalProduced),
      icon: Package,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-800',
      subtitle: 'Loaves baked'
    },
    {
      title: 'Total Sold',
      value: formatNumber(reportData.totalSold),
      icon: ShoppingCart,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-800',
      subtitle: 'Loaves sold'
    },
    {
      title: 'Total Leftover',
      value: formatNumber(reportData.totalLeftover),
      icon: AlertTriangle,
      bgColor: reportData.totalLeftover > 50 ? 'bg-red-100' : 'bg-gray-100',
      iconColor: reportData.totalLeftover > 50 ? 'text-red-600' : 'text-gray-600',
      textColor: reportData.totalLeftover > 50 ? 'text-red-800' : 'text-gray-800',
      subtitle: 'Unsold loaves'
    },
    {
      title: 'Sales Efficiency',
      value: `${reportData.totalProduced > 0 ? ((reportData.totalSold / reportData.totalProduced) * 100).toFixed(1) : 0}%`,
      icon: Target,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      textColor: 'text-orange-800',
      subtitle: 'Sold vs Produced'
    },
    {
      title: 'Total Discounts',
      value: formatCurrency(reportData.totalDiscounts),
      icon: TrendingDown,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-800',
      subtitle: 'Given to customers'
    },
    {
      title: 'Best Bread Type',
      value: reportData.bestPerformingBreadType,
      icon: Award,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-800',
      subtitle: 'Top performer'
    },
    {
      title: 'Best Shift',
      value: reportData.bestPerformingShift,
      icon: Clock,
      bgColor: reportData.bestPerformingShift === 'morning' ? 'bg-orange-100' : 'bg-indigo-100',
      iconColor: reportData.bestPerformingShift === 'morning' ? 'text-orange-600' : 'text-indigo-600',
      textColor: reportData.bestPerformingShift === 'morning' ? 'text-orange-800' : 'text-indigo-800',
      subtitle: 'Higher revenue'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Performance Overview</h2>
          <p className="text-sm text-gray-600 mt-1">
            Summary of operations for the selected period
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
          {reportData.shifts.length} shifts analyzed
        </Badge>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
            <div className="space-y-1">
              <p className={`text-2xl font-bold ${card.textColor}`}>
                {card.value}
              </p>
              <p className="text-xs text-gray-500">{card.subtitle}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Insights */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Quick Insights</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Revenue Performance</span>
            </div>
            <p className="text-xs text-gray-600">
              Average daily revenue of {formatCurrency(reportData.averageDailyRevenue)} 
              {reportData.averageDailyRevenue > 50000 ? ' exceeds target' : ' below target'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Production Efficiency</span>
            </div>
            <p className="text-xs text-gray-600">
              {reportData.totalProduced > 0 && reportData.totalLeftover / reportData.totalProduced < 0.1 
                ? 'Low waste rate - excellent production planning'
                : 'Consider adjusting production quantities'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Top Performer</span>
            </div>
            <p className="text-xs text-gray-600">
              {reportData.bestPerformingBreadType} is your best-selling bread type. 
              Focus on {reportData.bestPerformingShift} shift operations.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}