'use client';

import React, { useState, useEffect } from 'react';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { ShiftSelector, ShiftType } from '@/components/dashboard/ShiftSelector';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  DollarSign,
  TrendingUp,
  Package,
  CreditCard,
  Target,
  Clock,
  ShoppingCart,
  PlusCircle,
  Receipt,
  BarChart3,
  Star,
  AlertCircle,
  CheckCircle,
  Search,
  Eye,
  FileBarChart,
  Wallet,
  Calendar,
  Users,
  ArrowUp,
  ArrowDown,
  Banknote,
  Smartphone
} from 'lucide-react';

interface SalesRepDashboardProps {
  userId: string;
  userData: {
    name: string;
    email: string;
    role: string;
  };
  breadTypes: Array<{ id: string; name: string; unit_price: number }>;
}

interface SalesData {
  shiftStatus: {
    type: ShiftType;
    isActive: boolean;
    startTime?: Date;
    progress: number;
  };
  todaySales: {
    amount: number;
    transactions: number;
    trend: number;
  };
  shiftRevenue: {
    amount: number;
    target: number;
    percentage: number;
  };
  itemsSold: {
    quantity: number;
    target: number;
    percentage: number;
  };
  averageTransaction: {
    amount: number;
    trend: number;
  };
  salesTarget: {
    daily: number;
    achieved: number;
    percentage: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    quantitySold: number;
    revenue: number;
    trend: number;
  }>;
  paymentMethods: Array<{
    method: string;
    amount: number;
    percentage: number;
    transactions: number;
  }>;
  hourlySales: Array<{
    hour: string;
    amount: number;
    transactions: number;
  }>;
  salesLog: Array<{
    id: string;
    timestamp: Date;
    breadType: string;
    quantity: number;
    amount: number;
    paymentMethod: string;
    customer?: string;
  }>;
  shiftPerformance: {
    totalSales: number;
    transactionCount: number;
    averagePerTransaction: number;
    topSellingItem: string;
  };
}

const SAMPLE_SALES_DATA: SalesData = {
  shiftStatus: {
    type: 'morning',
    isActive: true,
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    progress: 50
  },
  todaySales: {
    amount: 85000,
    transactions: 43,
    trend: 12.5
  },
  shiftRevenue: {
    amount: 42000,
    target: 60000,
    percentage: 70
  },
  itemsSold: {
    quantity: 156,
    target: 200,
    percentage: 78
  },
  averageTransaction: {
    amount: 1975,
    trend: 8.2
  },
  salesTarget: {
    daily: 100000,
    achieved: 85000,
    percentage: 85
  },
  topProducts: [
    { id: '1', name: 'White Bread', quantitySold: 45, revenue: 22500, trend: 15.2 },
    { id: '2', name: 'Brown Bread', quantitySold: 38, revenue: 19000, trend: 8.1 },
    { id: '3', name: 'Wheat Bread', quantitySold: 32, revenue: 16000, trend: -2.5 },
    { id: '4', name: 'Rye Bread', quantitySold: 28, revenue: 14000, trend: 5.3 },
  ],
  paymentMethods: [
    { method: 'Cash', amount: 51000, percentage: 60, transactions: 26 },
    { method: 'Card', amount: 25500, percentage: 30, transactions: 12 },
    { method: 'Transfer', amount: 8500, percentage: 10, transactions: 5 },
  ],
  hourlySales: [
    { hour: '8 AM', amount: 12000, transactions: 8 },
    { hour: '9 AM', amount: 8500, transactions: 5 },
    { hour: '10 AM', amount: 15000, transactions: 10 },
    { hour: '11 AM', amount: 6500, transactions: 4 },
  ],
  salesLog: [
    { id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 5), breadType: 'White Bread', quantity: 2, amount: 1000, paymentMethod: 'Cash' },
    { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 12), breadType: 'Brown Bread', quantity: 1, amount: 500, paymentMethod: 'Card', customer: 'John Doe' },
    { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 18), breadType: 'Wheat Bread', quantity: 3, amount: 1500, paymentMethod: 'Transfer' },
    { id: '4', timestamp: new Date(Date.now() - 1000 * 60 * 25), breadType: 'White Bread', quantity: 1, amount: 500, paymentMethod: 'Cash' },
  ],
  shiftPerformance: {
    totalSales: 42000,
    transactionCount: 25,
    averagePerTransaction: 1680,
    topSellingItem: 'White Bread'
  }
};

export function SalesRepDashboard({ userId, userData, breadTypes }: SalesRepDashboardProps) {
  const [salesData, setSalesData] = useState<SalesData>(SAMPLE_SALES_DATA);
  const [currentShift, setCurrentShift] = useState<ShiftType>('morning');
  const [isShiftActive, setIsShiftActive] = useState(true);
  const [showRecordSale, setShowRecordSale] = useState(false);
  const [newSale, setNewSale] = useState({
    breadType: '',
    quantity: '',
    paymentMethod: '',
    customer: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Simulate real-time sales updates
    const interval = setInterval(() => {
      setSalesData(prev => ({
        ...prev,
        todaySales: {
          ...prev.todaySales,
          amount: prev.todaySales.amount + Math.floor(Math.random() * 2000),
          transactions: prev.todaySales.transactions + (Math.random() > 0.7 ? 1 : 0)
        },
        shiftRevenue: {
          ...prev.shiftRevenue,
          amount: prev.shiftRevenue.amount + Math.floor(Math.random() * 1000),
          percentage: Math.min(100, (prev.shiftRevenue.amount / prev.shiftRevenue.target) * 100)
        }
      }));
    }, 20000); // Update every 20 seconds

    return () => clearInterval(interval);
  }, []);

  const handleShiftChange = (shift: ShiftType) => {
    setCurrentShift(shift);
  };

  const handleStartShift = () => {
    setIsShiftActive(true);
    setSalesData(prev => ({
      ...prev,
      shiftStatus: {
        ...prev.shiftStatus,
        type: currentShift,
        isActive: true,
        startTime: new Date()
      }
    }));
  };

  const handleEndShift = () => {
    setIsShiftActive(false);
    console.log('Shift ended');
  };

  const handleRecordSale = () => {
    setShowRecordSale(true);
  };

  const handleViewProducts = () => {
    console.log('Viewing products');
  };

  const handlePriceCheck = () => {
    console.log('Checking prices');
  };

  const handleSalesReport = () => {
    console.log('Generating sales report');
  };

  const handleSubmitSale = () => {
    if (!newSale.breadType || !newSale.quantity || !newSale.paymentMethod) {
      return;
    }

    const breadType = breadTypes.find(b => b.id === newSale.breadType);
    if (!breadType) return;

    const amount = parseInt(newSale.quantity) * breadType.unit_price;
    const saleRecord = {
      id: Date.now().toString(),
      timestamp: new Date(),
      breadType: breadType.name,
      quantity: parseInt(newSale.quantity),
      amount,
      paymentMethod: newSale.paymentMethod,
      customer: newSale.customer || undefined
    };

    setSalesData(prev => ({
      ...prev,
      salesLog: [saleRecord, ...prev.salesLog.slice(0, 9)],
      todaySales: {
        ...prev.todaySales,
        amount: prev.todaySales.amount + amount,
        transactions: prev.todaySales.transactions + 1
      }
    }));

    setNewSale({ breadType: '', quantity: '', paymentMethod: '', customer: '' });
    setShowRecordSale(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Cash': return <Banknote className="h-4 w-4 text-green-600" />;
      case 'Card': return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'Transfer': return <Smartphone className="h-4 w-4 text-purple-600" />;
      default: return <Wallet className="h-4 w-4 text-gray-600" />;
    }
  };

  const quickActions = [
    { label: 'Record Sale', icon: PlusCircle, onClick: handleRecordSale, variant: 'default' as const },
    { label: 'View Products', icon: Package, onClick: handleViewProducts, variant: 'outline' as const },
    { label: 'Price Check', icon: Search, onClick: handlePriceCheck, variant: 'outline' as const },
    { label: 'Sales Report', icon: FileBarChart, onClick: handleSalesReport, variant: 'outline' as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Rep Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {userData.name} • Sales Performance & Transaction Management
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={cn(
                'px-3 py-1',
                isShiftActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              )}>
                {isShiftActive ? 'Shift Active' : 'Shift Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Shift Management */}
        <div className="mb-6">
          <ShiftSelector
            currentShift={currentShift}
            onShiftChange={handleShiftChange}
            isShiftActive={isShiftActive}
            onStartShift={handleStartShift}
            onEndShift={handleEndShift}
            role="sales_rep"
          />
        </div>

        {/* Row 1: Sales Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <DashboardCard
            title="Today's Sales"
            value={formatCurrency(salesData.todaySales.amount)}
            subtitle={`${salesData.todaySales.transactions} transactions`}
            icon={DollarSign}
            iconColor="text-green-600"
            type="primary"
            size="large"
            trend={{
              value: salesData.todaySales.trend,
              label: 'vs yesterday',
              isPositive: salesData.todaySales.trend > 0
            }}
          />
          <DashboardCard
            title="Shift Revenue"
            value={formatCurrency(salesData.shiftRevenue.amount)}
            subtitle={`${Math.round(salesData.shiftRevenue.percentage)}% of target`}
            icon={Target}
            iconColor="text-blue-600"
            type="primary"
            size="large"
            badge={{
              label: salesData.shiftRevenue.percentage >= 100 ? 'Target Met' : 'In Progress',
              color: salesData.shiftRevenue.percentage >= 100 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }}
          />
          <DashboardCard
            title="Items Sold"
            value={salesData.itemsSold.quantity}
            subtitle={`${Math.round(salesData.itemsSold.percentage)}% of target`}
            icon={Package}
            iconColor="text-purple-600"
            type="primary"
            size="large"
            trend={{
              value: salesData.itemsSold.percentage,
              label: 'target progress',
              isPositive: salesData.itemsSold.percentage > 50
            }}
          />
          <DashboardCard
            title="Average Transaction"
            value={formatCurrency(salesData.averageTransaction.amount)}
            subtitle="Per transaction value"
            icon={Receipt}
            iconColor="text-orange-600"
            type="primary"
            size="large"
            trend={{
              value: salesData.averageTransaction.trend,
              label: 'vs last shift',
              isPositive: salesData.averageTransaction.trend > 0
            }}
          />
        </div>

        {/* Row 2: Sales Target Progress - Full Width */}
        <div className="mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Sales Target Progress</h3>
                <p className="text-gray-600">Track your daily sales performance against targets</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  salesData.salesTarget.percentage >= 100 ? 'bg-green-100 text-green-800' : 
                  salesData.salesTarget.percentage >= 75 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                )}>
                  {Math.round(salesData.salesTarget.percentage)}% Complete
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Daily Sales Target</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(salesData.salesTarget.achieved)} / {formatCurrency(salesData.salesTarget.daily)}
                </span>
              </div>
              <Progress value={salesData.salesTarget.percentage} className="h-4" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(salesData.salesTarget.achieved)}
                  </div>
                  <div className="text-xs text-green-800">Achieved</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-600">
                    {formatCurrency(salesData.salesTarget.daily - salesData.salesTarget.achieved)}
                  </div>
                  <div className="text-xs text-gray-800">Remaining</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(salesData.salesTarget.daily)}
                  </div>
                  <div className="text-xs text-blue-800">Target</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Row 3: Top Products, Payment Methods, Hourly Sales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <DashboardCard
            title="Top Products"
            icon={Star}
            iconColor="text-yellow-600"
            type="metric"
          >
            <div className="space-y-3">
              {salesData.topProducts.slice(0, 3).map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{product.name}</span>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        product.trend > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      )}>
                        {product.trend > 0 ? '↗' : '↘'} {Math.abs(product.trend)}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {product.quantitySold} units • {formatCurrency(product.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Payment Methods"
            icon={CreditCard}
            iconColor="text-blue-600"
            type="metric"
          >
            <div className="space-y-3">
              {salesData.paymentMethods.map((method) => (
                <div key={method.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(method.method)}
                    <span className="font-medium text-gray-900">{method.method}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(method.amount)}</div>
                    <div className="text-sm text-gray-600">{method.percentage}% • {method.transactions} txns</div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Hourly Sales"
            icon={Clock}
            iconColor="text-purple-600"
            type="metric"
          >
            <div className="space-y-3">
              {salesData.hourlySales.map((hour) => (
                <div key={hour.hour} className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{hour.hour}</span>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(hour.amount)}</div>
                    <div className="text-sm text-gray-600">{hour.transactions} transactions</div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>

        {/* Row 4: Quick Actions */}
        <div className="mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Sales Actions</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  onClick={action.onClick}
                  className="flex items-center gap-2"
                  disabled={!isShiftActive && action.label !== 'Record Sale'}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Record Sale Modal */}
        {showRecordSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Record New Sale</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRecordSale(false)}
                >
                  ×
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="breadType">Bread Type</Label>
                  <Select value={newSale.breadType} onValueChange={(value) => setNewSale(prev => ({ ...prev, breadType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bread type" />
                    </SelectTrigger>
                    <SelectContent>
                      {breadTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} - {formatCurrency(type.unit_price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newSale.quantity}
                    onChange={(e) => setNewSale(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="Enter quantity"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={newSale.paymentMethod} onValueChange={(value) => setNewSale(prev => ({ ...prev, paymentMethod: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customer">Customer Name (Optional)</Label>
                  <Input
                    id="customer"
                    value={newSale.customer}
                    onChange={(e) => setNewSale(prev => ({ ...prev, customer: e.target.value }))}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSubmitSale} className="flex-1">
                    Record Sale
                  </Button>
                  <Button variant="outline" onClick={() => setShowRecordSale(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Row 5: Sales Log & Shift Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Log */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sales Log</h3>
              <Badge className="bg-gray-100 text-gray-800">
                {salesData.salesLog.length} transactions
              </Badge>
            </div>
            <div className="space-y-4">
              {salesData.salesLog.map((sale) => (
                <div key={sale.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getPaymentMethodIcon(sale.paymentMethod)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{sale.breadType}</span>
                      <span className="text-sm text-gray-600">× {sale.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-medium text-green-600">{formatCurrency(sale.amount)}</span>
                      <span className="text-sm text-gray-500">• {sale.paymentMethod}</span>
                      {sale.customer && (
                        <>
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-gray-600">{sale.customer}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(sale.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Shift Performance */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Shift Performance</h3>
              <Badge className="bg-blue-100 text-blue-800">
                Current Shift
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(salesData.shiftPerformance.totalSales)}
                  </div>
                  <div className="text-sm text-green-800">Total Sales</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {salesData.shiftPerformance.transactionCount}
                  </div>
                  <div className="text-sm text-blue-800">Transactions</div>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {formatCurrency(salesData.shiftPerformance.averagePerTransaction)}
                </div>
                <div className="text-sm text-purple-800">Average per Transaction</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-sm font-medium text-yellow-800">Top Selling Item</div>
                <div className="text-lg font-bold text-yellow-600">
                  {salesData.shiftPerformance.topSellingItem}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                <Clock className="h-4 w-4" />
                <span>
                  Shift duration: {salesData.shiftStatus.startTime ? 
                    Math.floor((new Date().getTime() - salesData.shiftStatus.startTime.getTime()) / (1000 * 60 * 60)) + ' hours' : 
                    'Not started'
                  }
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}