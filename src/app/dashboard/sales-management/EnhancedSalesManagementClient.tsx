'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BreadType, SalesLog, UserRole } from '@/types';
import { useShift } from '@/contexts/ShiftContext';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { 
  Plus, 
  Package, 
  AlertCircle, 
  FileText,
  TrendingUp,
  History,
  Send,
  ShoppingCart,
  X,
  Check,
  Minus
} from 'lucide-react';
import { SalesModal } from '@/components/dashboards/sales/SalesModal';
import { toast } from 'sonner';

interface EnhancedSalesManagementClientProps {
  breadTypes: BreadType[];
  salesLogs: (SalesLog & { bread_types: BreadType })[];
  userRole: UserRole;
  userId: string;
  userName: string;
}

interface RemainingBread {
  id: string;
  breadType: BreadType;
  quantity: number;
  timestamp: string;
}

interface SalesRecord {
  id: string;
  breadType: BreadType;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  timestamp: string;
  paymentMethod: string;
}

interface QuickRecordItem {
  breadType: BreadType;
  quantity: number;
}

export default function EnhancedSalesManagementClient({
  breadTypes,
  userId,
  userName
}: EnhancedSalesManagementClientProps) {
  const { currentShift } = useShift();
  
  // State management
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [remainingBreads, setRemainingBreads] = useState<RemainingBread[]>([]);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showRemainingModal, setShowRemainingModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQuickRecordAll, setShowQuickRecordAll] = useState(false);
  const [showSalesHistoryModal, setShowSalesHistoryModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Quick record all state
  const [quickRecordItems, setQuickRecordItems] = useState<QuickRecordItem[]>([]);
  const [quickRemainingItems, setQuickRemainingItems] = useState<QuickRecordItem[]>([]);

  // Calculate today's metrics
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaySales = salesRecords.filter(record => 
    new Date(record.timestamp) >= todayStart
  );

  const metrics = {
    todayRevenue: todaySales.reduce((sum, record) => sum + record.totalAmount, 0),
    itemsSold: todaySales.reduce((sum, record) => sum + record.quantity, 0),
    returns: 0,
    totalRecords: salesRecords.length,
    remainingItems: remainingBreads.reduce((sum, item) => sum + item.quantity, 0)
  };

  // Handle adding new sales record
  const handleAddSalesRecord = (record: Omit<SalesRecord, 'id' | 'timestamp'>) => {
    const newRecord: SalesRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setSalesRecords(prev => [newRecord, ...prev]);
    console.log(`Sale recorded: ${record.quantity} ${record.breadType.name}`);
  };

  // Handle adding remaining bread
  const handleAddRemainingBread = (bread: Omit<RemainingBread, 'id' | 'timestamp'>) => {
    const newRemaining: RemainingBread = {
      ...bread,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setRemainingBreads(prev => [newRemaining, ...prev]);
    console.log(`Remaining bread added: ${bread.quantity} ${bread.breadType.name}`);
  };

  // Handle submit with warning for missing remaining breads
  const handleSubmit = () => {
    if (remainingBreads.length === 0) {
      setShowWarningModal(true);
    } else {
      setShowFeedbackModal(true);
    }
  };

  const confirmSubmit = () => {
    setShowWarningModal(false);
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = () => {
    setShowFeedbackModal(false);
    setShowReportModal(true);
  };

  const handleReportSubmit = () => {
    console.log('Report submitted:', {
      salesRecords,
      remainingBreads,
      feedback: feedbackText,
      shift: currentShift,
      userName
    });
    
    // Show success toast
    toast.success('Sales report submitted successfully!');
    
    // Reset state immediately - no delays
    setSalesRecords([]);
    setRemainingBreads([]);
    setFeedbackText('');
    setShowReportModal(false);
  };

  // Quick record all functions
  const initializeQuickRecord = () => {
    setQuickRecordItems(breadTypes.map(bt => ({ breadType: bt, quantity: 0 })));
    setQuickRemainingItems(breadTypes.map(bt => ({ breadType: bt, quantity: 0 })));
    setShowQuickRecordAll(true);
  };

  const updateQuickRecordQuantity = (breadTypeId: string, quantity: number, isRemaining: boolean = false) => {
    const items = isRemaining ? quickRemainingItems : quickRecordItems;
    const setItems = isRemaining ? setQuickRemainingItems : setQuickRecordItems;
    
    setItems(items.map(item => 
      item.breadType.id === breadTypeId 
        ? { ...item, quantity: Math.max(0, quantity) }
        : item
    ));
  };

  const submitQuickRecords = () => {
    // Add sales records
    quickRecordItems.forEach(item => {
      if (item.quantity > 0) {
        handleAddSalesRecord({
          breadType: item.breadType,
          quantity: item.quantity,
          unitPrice: item.breadType.unit_price,
          totalAmount: item.breadType.unit_price * item.quantity,
          paymentMethod: 'cash'
        });
      }
    });

    // Add remaining breads
    quickRemainingItems.forEach(item => {
      if (item.quantity > 0) {
        handleAddRemainingBread({
          breadType: item.breadType,
          quantity: item.quantity
        });
      }
    });

    // Show success toast
    toast.success('Quick records submitted successfully!');

    // Delay the modal close to prevent flash
    setTimeout(() => {
      setShowQuickRecordAll(false);
      setQuickRecordItems([]);
      setQuickRemainingItems([]);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
              <p className="text-gray-600 mt-1">Manage your daily sales and shift records</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="text-lg px-4 py-2">
                {currentShift === 'morning' ? '☀️ Morning Shift' : '🌙 Night Shift'}
              </Badge>
              <Button
                variant="outline"
                onClick={() => setShowSalesHistoryModal(true)}
                className="hidden md:flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow"
              >
                <History className="h-4 w-4" />
                Sales History
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-800">Today&apos;s Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrencyNGN(metrics.todayRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-800">Items Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{metrics.itemsSold}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-800">Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{metrics.returns}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-800">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{metrics.remainingItems}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => setShowSalesModal(true)}
            className="h-16 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            <Plus className="mr-2 h-5 w-5" />
            Record Sale
          </Button>
          <Button
            onClick={initializeQuickRecord}
            className="h-16 text-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
          >
            <FileText className="mr-2 h-5 w-5" />
            Quick Record All
          </Button>
          <Button
            onClick={() => setShowRemainingModal(true)}
            className="h-16 text-lg bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
          >
            <Package className="mr-2 h-5 w-5" />
            Add Remaining
          </Button>
        </div>

        {/* Sales Records Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recorded Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShoppingCart className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                <p>No sales recorded yet. Start by adding your first sale!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {salesRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{record.breadType.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrencyNGN(record.totalAmount)}</p>
                      <p className="text-sm text-gray-600">{record.quantity} units</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remaining Breads Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Remaining Breads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {remainingBreads.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                <p>No remaining breads recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {remainingBreads.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <p className="font-medium">{item.breadType.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-700">{item.quantity} units</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Section */}
        {(salesRecords.length > 0 || remainingBreads.length > 0) && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle>Ready to Submit Report?</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSubmit}
                className="w-full h-12 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Send className="mr-2 h-5 w-5" />
                Submit Report
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Mobile Sales History Button */}
        <Button
          onClick={() => setShowSalesHistoryModal(true)}
          className="w-full md:hidden h-12 text-lg shadow-md hover:shadow-lg transition-shadow"
          variant="outline"
        >
          <History className="mr-2 h-5 w-5" />
          View Sales History
        </Button>
      </div>

      {/* Modals */}
      <SalesModal
        isOpen={showSalesModal}
        onClose={() => setShowSalesModal(false)}
        userId={userId}
        currentShift={currentShift}
        onSalesRecorded={() => {
          // This will be handled by handleAddSalesRecord
        }}
      />

      {/* Quick Record All Page */}
      {showQuickRecordAll && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto animate-in fade-in duration-300">
          <div className="max-w-4xl mx-auto p-4 md:p-6 animate-in slide-in-from-bottom-4 duration-300">
            <Card className="shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white relative flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Quick Record All</CardTitle>
                  <p className="text-blue-100">Record multiple sales and remaining breads at once</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQuickRecordAll(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-6 w-6" />
                </Button>
              </CardHeader>
              
              <CardContent className="p-6 space-y-8">
                {/* Sales Section */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Record Sales
                  </h3>
                  <div className="space-y-4">
                    {quickRecordItems.map((item) => (
                      <div key={item.breadType.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.breadType.name}</p>
                          <p className="text-sm text-gray-600">{formatCurrencyNGN(item.breadType.unit_price)} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <input
                            type="number"
                            min="0"
                            value={item.quantity || ''}
                            onChange={(e) => updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0)}
                            className="w-16 text-center border rounded px-2 py-1"
                            placeholder="0"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Remaining Section */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Record Remaining Breads
                  </h3>
                  <div className="space-y-4">
                    {quickRemainingItems.map((item) => (
                      <div key={item.breadType.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                        <div className="flex-1">
                          <p className="font-medium">{item.breadType.name}</p>
                          <p className="text-sm text-gray-600">Remaining quantity</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity - 1, true)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <input
                            type="number"
                            min="0"
                            value={item.quantity || ''}
                            onChange={(e) => updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0, true)}
                            className="w-16 text-center border rounded px-2 py-1"
                            placeholder="0"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity + 1, true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recorded Items Preview */}
                <div>
                  <h3 className="text-xl font-bold mb-4">Recorded Items</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Sales ({quickRecordItems.filter(i => i.quantity > 0).length})</h4>
                      <div className="space-y-1">
                        {quickRecordItems.filter(item => item.quantity > 0).map(item => (
                          <div key={item.breadType.id} className="flex justify-between text-sm">
                            <span>{item.breadType.name}</span>
                            <span>{item.quantity} × {formatCurrencyNGN(item.breadType.unit_price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Remaining ({quickRemainingItems.filter(i => i.quantity > 0).length})</h4>
                      <div className="space-y-1">
                        {quickRemainingItems.filter(item => item.quantity > 0).map(item => (
                          <div key={item.breadType.id} className="flex justify-between text-sm">
                            <span>{item.breadType.name}</span>
                            <span>{item.quantity} remaining</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowQuickRecordAll(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitQuickRecords}
                    disabled={quickRecordItems.every(i => i.quantity === 0) && quickRemainingItems.every(i => i.quantity === 0)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Record All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Enhanced Remaining Bread Modal */}
      {showRemainingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRemainingModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
              <CardTitle className="text-xl">Add Remaining Breads</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {breadTypes.map((breadType) => (
                  <div key={breadType.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{breadType.name}</p>
                      <p className="text-sm text-gray-600">{formatCurrencyNGN(breadType.unit_price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const existing = remainingBreads.find(r => r.breadType.id === breadType.id);
                          const newQuantity = Math.max(0, (existing?.quantity || 0) - 1);
                          if (newQuantity === 0 && existing) {
                            setRemainingBreads(prev => prev.filter(r => r.breadType.id !== breadType.id));
                          } else if (existing) {
                            setRemainingBreads(prev => prev.map(r => 
                              r.breadType.id === breadType.id ? { ...r, quantity: newQuantity } : r
                            ));
                          }
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <input
                        type="number"
                        min="0"
                        value={remainingBreads.find(r => r.breadType.id === breadType.id)?.quantity || ''}
                        onChange={(e) => {
                          const quantity = parseInt(e.target.value) || 0;
                          if (quantity === 0) {
                            setRemainingBreads(prev => prev.filter(r => r.breadType.id !== breadType.id));
                          } else {
                            const existing = remainingBreads.find(r => r.breadType.id === breadType.id);
                            if (existing) {
                              setRemainingBreads(prev => prev.map(r => 
                                r.breadType.id === breadType.id ? { ...r, quantity } : r
                              ));
                            } else {
                              handleAddRemainingBread({ breadType, quantity });
                            }
                          }
                        }}
                        className="w-16 text-center border rounded px-2"
                        placeholder="0"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const existing = remainingBreads.find(r => r.breadType.id === breadType.id);
                          const newQuantity = (existing?.quantity || 0) + 1;
                          if (existing) {
                            setRemainingBreads(prev => prev.map(r => 
                              r.breadType.id === breadType.id ? { ...r, quantity: newQuantity } : r
                            ));
                          } else {
                            handleAddRemainingBread({ breadType, quantity: 1 });
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowRemainingModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowRemainingModal(false)}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
                >
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <Card className="max-w-md w-full animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFeedbackModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
              <CardTitle>Feedback</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <textarea
                  placeholder="Add any feedback or issues..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                />
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleFeedbackSubmit}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReportModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
              <CardTitle>Final Report</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Sales Records ({salesRecords.length})</h3>
                  <div className="space-y-2">
                    {salesRecords.map(record => (
                      <div key={record.id} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>{record.breadType.name} x{record.quantity}</span>
                        <span>{formatCurrencyNGN(record.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {remainingBreads.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Remaining Breads ({remainingBreads.length})</h3>
                    <div className="space-y-2">
                      {remainingBreads.map(item => (
                        <div key={item.id} className="flex justify-between p-2 bg-yellow-50 rounded">
                          <span>{item.breadType.name} x{item.quantity}</span>
                          <span>Remaining</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {feedbackText && (
                  <div>
                    <h3 className="font-semibold mb-2">Feedback</h3>
                    <p className="p-2 bg-gray-50 rounded">{feedbackText}</p>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReportSubmit}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    Submit Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales History Modal */}
      {showSalesHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSalesHistoryModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
              <CardTitle>Sales History</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-center text-gray-500 py-8">
                Sales history feature coming soon...
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <Card className="max-w-md w-full animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowWarningModal(false)}
                className="absolute top-4 right-4 text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Warning
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">
                You haven&apos;t added any remaining breads. Do you still want to proceed?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmSubmit}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
                >
                  Proceed Anyway
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
