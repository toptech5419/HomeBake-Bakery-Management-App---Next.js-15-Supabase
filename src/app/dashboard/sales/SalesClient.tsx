'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { MobileLoading } from '@/components/ui/mobile-loading';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, RefreshCw, Plus, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SalesClientProps {
  userRole: string;
  userId: string;
}

export function SalesClient({ userRole, userId }: SalesClientProps) {
  const { salesLogs, breadTypes, isLoading, error, addSalesLog, refreshSales } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    bread_type_id: '',
    quantity: '',
    discount: '0',
    shift: 'morning' as 'morning' | 'night'
  });

  // Auto-detect shift
  useEffect(() => {
    const hour = new Date().getHours();
    setFormData(prev => ({
      ...prev,
      shift: hour >= 6 && hour < 14 ? 'morning' : 'night'
    }));
  }, []);

  // Calculate metrics
  const todayLogs = salesLogs.filter(log => {
    const logDate = new Date(log.created_at).toDateString();
    return logDate === new Date().toDateString();
  });

  const totalSales = todayLogs.reduce((sum, log) => {
    const total = (log.quantity * (log.unit_price || 0)) - (log.discount || 0);
    return sum + total;
  }, 0);

  const totalUnits = todayLogs.reduce((sum, log) => sum + log.quantity, 0);
  const totalDiscount = todayLogs.reduce((sum, log) => sum + (log.discount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bread_type_id || !formData.quantity) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    const breadType = breadTypes.find(b => b.id === formData.bread_type_id);
    if (!breadType) return;

    setIsAdding(true);
    try {
      await addSalesLog({
        bread_type_id: formData.bread_type_id,
        quantity: parseInt(formData.quantity),
        unit_price: breadType.unit_price,
        discount: parseFloat(formData.discount) || 0,
        shift: formData.shift,
        recorded_by: userId
      });

      toast({
        title: 'Success',
        description: 'Sale recorded successfully'
      });

      // Reset form
      setFormData({
        bread_type_id: '',
        quantity: '',
        discount: '0',
        shift: formData.shift
      });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record sale',
        variant: 'destructive'
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSales();
      toast({
        title: 'Refreshed',
        description: 'Sales data updated'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh data',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return <MobileLoading message="Loading sales data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md flex flex-col items-center py-12">
          <ShoppingCart className="h-12 w-12 mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </Card>
      </div>
    );
  }

  const selectedBreadType = formData.bread_type_id ? 
    breadTypes.find(b => b.id === formData.bread_type_id) : null;
  const subtotal = selectedBreadType ? 
    parseInt(formData.quantity || '0') * selectedBreadType.unit_price : 0;
  const total = subtotal - parseFloat(formData.discount || '0');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground">Record bread sales</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          {userRole === 'sales_rep' && (
            <>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Record Sale</span>
              </Button>
              
              {/* Mobile-friendly Modal */}
              {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                  <div 
                    className="fixed inset-0 bg-black/50" 
                    onClick={() => setIsDialogOpen(false)}
                  />
                  <div className="relative bg-white rounded-t-xl sm:rounded-lg w-full sm:max-w-md p-6 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 max-h-[90vh] overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-4">Record Sale</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="bread_type">Bread Type</Label>
                        <Select
                          value={formData.bread_type_id}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, bread_type_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select bread type" />
                          </SelectTrigger>
                          <SelectContent>
                            {breadTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name} - ₦{type.unit_price}
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
                          placeholder="Enter quantity"
                          value={formData.quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="discount">Discount (₦)</Label>
                        <Input
                          id="discount"
                          type="number"
                          placeholder="0"
                          value={formData.discount}
                          onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      {/* Sale Preview */}
                      {selectedBreadType && parseInt(formData.quantity || '0') > 0 && (
                        <Card className="p-4 bg-gray-50">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>₦{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Discount:</span>
                              <span>-₦{parseFloat(formData.discount || '0').toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-base">
                              <span>Total:</span>
                              <span>₦{total.toLocaleString()}</span>
                            </div>
                          </div>
                        </Card>
                      )}
                      
                      <div className="flex gap-3 pt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isAdding}>
                          {isAdding ? 'Recording...' : 'Record Sale'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-bold">₦{totalSales.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Sales</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{totalUnits}</div>
          <div className="text-sm text-muted-foreground">Units Sold</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{todayLogs.length}</div>
          <div className="text-sm text-muted-foreground">Transactions</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-600">₦{totalDiscount.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Discounts</div>
        </Card>
      </div>

      {/* Sales Logs */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Today&apos;s Sales</h3>
          <p className="text-sm text-muted-foreground">{todayLogs.length} transactions</p>
        </div>
        <div className="divide-y">
          {todayLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No sales recorded today
            </div>
          ) : (
            todayLogs.map((log) => {
              const breadType = breadTypes.find(b => b.id === log.bread_type_id);
              const unitPrice = log.unit_price || 0;
              const discount = log.discount || 0;
              const total = (log.quantity * unitPrice) - discount;
              
              return (
                <div key={log.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{breadType?.name || 'Unknown'}</div>
                      <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                        <div>{log.quantity} × ₦{unitPrice} = ₦{(log.quantity * unitPrice).toLocaleString()}</div>
                        {discount > 0 && (
                          <div className="text-orange-600">Discount: -₦{discount.toLocaleString()}</div>
                        )}
                        <div>{format(new Date(log.created_at), 'h:mm a')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">₦{total.toLocaleString()}</div>
                      <Badge className={log.shift === 'morning' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                        {log.shift}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}