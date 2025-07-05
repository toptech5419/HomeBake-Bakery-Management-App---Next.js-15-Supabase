'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { MobileLoading, SkeletonCard } from '@/components/ui/mobile-loading';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, RefreshCw, Plus } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast-provider';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
// Dialog component import removed - we'll use a simple modal instead
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductionClientProps {
  userRole: string;
  userId: string;
}

export function ProductionClient({ userRole, userId }: ProductionClientProps) {
  const { productionLogs, breadTypes, isLoading, error, addProductionLog, refreshProduction } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    bread_type_id: '',
    quantity: '',
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
  const todayLogs = productionLogs.filter(log => {
    const logDate = new Date(log.created_at).toDateString();
    return logDate === new Date().toDateString();
  });

  const totalToday = todayLogs.reduce((sum, log) => sum + log.quantity, 0);
  const morningTotal = todayLogs.filter(log => log.shift === 'morning').reduce((sum, log) => sum + log.quantity, 0);
  const nightTotal = todayLogs.filter(log => log.shift === 'night').reduce((sum, log) => sum + log.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bread_type_id || !formData.quantity) {
      toast({
        title: 'Error',
        description: 'Please fill all fields',
        variant: 'destructive'
      });
      return;
    }

    setIsAdding(true);
    try {
      await addProductionLog({
        bread_type_id: formData.bread_type_id,
        quantity: parseInt(formData.quantity),
        shift: formData.shift,
        recorded_by: userId
      });

      toast({
        title: 'Success',
        description: 'Production log added successfully'
      });

      // Reset form
      setFormData({
        bread_type_id: '',
        quantity: '',
        shift: formData.shift
      });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add production log',
        variant: 'destructive'
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProduction();
      toast({
        title: 'Refreshed',
        description: 'Production data updated'
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
    return <MobileLoading message="Loading production data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md flex flex-col items-center py-12">
          <Package className="h-12 w-12 mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production</h1>
          <p className="text-muted-foreground">Track bread production</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="relative"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          {userRole === 'manager' && (
            <>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Add</span>
              </Button>
              
              {/* Improved Mobile-friendly Modal */}
              {isDialogOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                  <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
                    onClick={() => setIsDialogOpen(false)}
                  />
                  <div className="relative bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-2xl border">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                      <h2 className="text-lg font-semibold">Add Production Log</h2>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIsDialogOpen(false)}
                        className="h-8 w-8 p-0"
                      >
                        ×
                      </Button>
                    </div>
                    
                    {/* Modal Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6">
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="bread_type" className="text-sm font-medium">Bread Type *</Label>
                          <Select
                            value={formData.bread_type_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, bread_type_id: value }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose bread type" />
                            </SelectTrigger>
                            <SelectContent 
                              position="popper" 
                              side="bottom" 
                              sideOffset={4}
                              className="z-[200] w-full min-w-[var(--radix-select-trigger-width)]"
                            >
                              {breadTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{type.name}</span>
                                    <span className="text-sm text-gray-500">₦{type.unit_price} per unit</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="quantity" className="text-sm font-medium">Quantity *</Label>
                          <Input
                            id="quantity"
                            type="number"
                            placeholder="Enter quantity"
                            value={formData.quantity}
                            onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                            min="1"
                            className="w-full text-base"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="shift" className="text-sm font-medium">Shift</Label>
                          <Select
                            value={formData.shift}
                            onValueChange={(value: 'morning' | 'night') => setFormData(prev => ({ ...prev, shift: value }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent 
                              position="popper" 
                              side="bottom" 
                              sideOffset={4}
                              className="z-[200] w-full min-w-[var(--radix-select-trigger-width)]"
                            >
                              <SelectItem value="morning">
                                <div className="flex flex-col">
                                  <span className="font-medium">Morning Shift</span>
                                  <span className="text-sm text-gray-500">6:00 AM - 2:00 PM</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="night">
                                <div className="flex flex-col">
                                  <span className="font-medium">Night Shift</span>
                                  <span className="text-sm text-gray-500">2:00 PM - 10:00 PM</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </form>
                    </div>
                    
                    {/* Modal Footer */}
                    <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        className="flex-1" 
                        disabled={isAdding || !formData.bread_type_id || !formData.quantity}
                      >
                        {isAdding ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Adding...
                          </>
                        ) : (
                          'Add Production'
                        )}
                      </Button>
                    </div>
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
          <div className="text-2xl font-bold">{todayLogs.length}</div>
          <div className="text-sm text-muted-foreground">Entries Today</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{totalToday}</div>
          <div className="text-sm text-muted-foreground">Total Units</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{morningTotal}</div>
          <div className="text-sm text-muted-foreground">Morning</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">{nightTotal}</div>
          <div className="text-sm text-muted-foreground">Night</div>
        </Card>
      </div>

      {/* Production Logs */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Today&apos;s Production</h3>
          <p className="text-sm text-muted-foreground">{todayLogs.length} entries</p>
        </div>
        <div className="divide-y">
          {todayLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No production logs for today
            </div>
          ) : (
            todayLogs.map((log) => {
              const breadType = breadTypes.find(b => b.id === log.bread_type_id);
              return (
                <div key={log.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{breadType?.name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'h:mm a')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{log.quantity}</div>
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