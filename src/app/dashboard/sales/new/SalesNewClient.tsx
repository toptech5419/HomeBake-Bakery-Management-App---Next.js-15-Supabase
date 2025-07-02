'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Package, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { UserRole, BreadType } from '@/types';
import { useShift } from '@/contexts/ShiftContext';

interface SalesNewClientProps {
  breadTypes: BreadType[];
  todayProduction: { bread_type_id: string; quantity: number }[];
  todaySales: { bread_type_id: string; quantity: number }[];
  userRole: UserRole;
  userId: string;
}

interface SalesEntry {
  bread_type_id: string;
  quantity: number;
  unit_price?: number;
  discount?: number;
  leftover?: number;
}

export default function SalesNewClient({
  breadTypes,
  todayProduction,
  todaySales,
  userRole,
  userId
}: SalesNewClientProps) {
  const { currentShift } = useShift();
  const [loading, setLoading] = useState(false);
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([]);
  const [notes, setNotes] = useState('');
  const toast = useToast();

  // Calculate available inventory for each bread type
  const getAvailableInventory = (breadTypeId: string) => {
    const produced = todayProduction
      .filter(p => p.bread_type_id === breadTypeId)
      .reduce((sum, p) => sum + p.quantity, 0);
    
    const sold = todaySales
      .filter(s => s.bread_type_id === breadTypeId)
      .reduce((sum, s) => sum + s.quantity, 0);
    
    return Math.max(0, produced - sold);
  };

  // Initialize sales entries
  useEffect(() => {
    const initialEntries = breadTypes.map(breadType => ({
      bread_type_id: breadType.id,
      quantity: 0,
      unit_price: breadType.unit_price,
      discount: 0,
      leftover: 0
    }));
    setSalesEntries(initialEntries);
  }, [breadTypes]);

  const updateSalesEntry = (breadTypeId: string, field: keyof SalesEntry, value: number) => {
    setSalesEntries(prev => prev.map(entry => 
      entry.bread_type_id === breadTypeId 
        ? { ...entry, [field]: value }
        : entry
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validEntries = salesEntries.filter(entry => 
        entry.quantity > 0 || (entry.leftover && entry.leftover > 0)
      );

      if (validEntries.length === 0) {
        toast.error('Please enter at least one sale or leftover quantity.');
        setLoading(false);
        return;
      }

      // Check inventory availability
      for (const entry of validEntries) {
        const available = getAvailableInventory(entry.bread_type_id);
        const totalRequested = entry.quantity + (entry.leftover || 0);
        
        if (totalRequested > available) {
          const breadType = breadTypes.find(b => b.id === entry.bread_type_id);
          toast.error(`Not enough inventory for ${breadType?.name}. Available: ${available}, Requested: ${totalRequested}`);
          setLoading(false);
          return;
        }
      }

      // Submit sales entries
      const responses = await Promise.all(
        validEntries.map(async (entry) => {
          const salesData = {
            bread_type_id: entry.bread_type_id,
            quantity: entry.quantity,
            unit_price: entry.unit_price,
            discount: entry.discount || 0,
            leftover: entry.leftover || 0,
            shift: currentShift,
            recorded_by: userId,
            returned: false
          };

          const response = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(salesData)
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
          }

          return response.json();
        })
      );

      // Save notes if provided
      if (notes.trim()) {
        await fetch('/api/shift-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            shift: currentShift,
            note: notes.trim()
          })
        });
      }

      toast.success(`Sales recorded successfully for ${validEntries.length} bread type(s)!`);
      
      // Reset form
      setSalesEntries(prev => prev.map(entry => ({
        ...entry,
        quantity: 0,
        leftover: 0
      })));
      setNotes('');
      
      // Redirect to sales dashboard
      setTimeout(() => {
        window.location.href = '/dashboard/sales';
      }, 1500);

    } catch (error) {
      toast.error((error as Error).message || 'Failed to record sales');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Record New Sales</h1>
            <p className="text-gray-600 mt-1">
              Log bread sales and leftover inventory for {currentShift} shift
            </p>
          </div>
          <Badge className={`ml-auto ${currentShift === 'morning' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'}`}>
            {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} Shift
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sales Entry Form */}
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Sales & Leftover Entry</h2>
              <p className="text-sm text-gray-600">
                Enter quantities sold and any leftover bread for each type
              </p>
            </div>

            <div className="space-y-6">
              {breadTypes.map((breadType) => {
                const entry = salesEntries.find(e => e.bread_type_id === breadType.id);
                const available = getAvailableInventory(breadType.id);
                const isLowStock = available <= 5;
                
                return (
                  <div key={breadType.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{breadType.name}</h3>
                        {breadType.size && (
                          <p className="text-sm text-gray-500">Size: {breadType.size}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                                                 <Badge className={isLowStock ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                           {isLowStock && <AlertTriangle className="h-3 w-3 mr-1" />}
                           {available} available
                         </Badge>
                         <Badge className="bg-blue-100 text-blue-800">
                           ₦{breadType.unit_price}
                         </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Quantity Sold */}
                      <div>
                        <Label className="text-sm font-medium">Quantity Sold</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="0"
                          max={available}
                          value={entry?.quantity || ''}
                          onChange={(e) => updateSalesEntry(
                            breadType.id, 
                            'quantity', 
                            parseInt(e.target.value) || 0
                          )}
                          placeholder="Enter quantity"
                          className="text-lg"
                          disabled={loading}
                        />
                      </div>

                      {/* Unit Price */}
                      <div>
                        <Label className="text-sm font-medium">Unit Price (₦)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry?.unit_price || ''}
                          onChange={(e) => updateSalesEntry(
                            breadType.id, 
                            'unit_price', 
                            parseFloat(e.target.value) || 0
                          )}
                          placeholder={breadType.unit_price.toString()}
                          disabled={loading}
                        />
                      </div>

                      {/* Discount */}
                      <div>
                        <Label className="text-sm font-medium">Discount (₦)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry?.discount || ''}
                          onChange={(e) => updateSalesEntry(
                            breadType.id, 
                            'discount', 
                            parseFloat(e.target.value) || 0
                          )}
                          placeholder="0"
                          disabled={loading}
                        />
                      </div>

                      {/* Leftover */}
                      <div>
                        <Label className="text-sm font-medium">Leftover</Label>
                        <Input
                          type="number"
                          min="0"
                          max={available - (entry?.quantity || 0)}
                          value={entry?.leftover || ''}
                          onChange={(e) => updateSalesEntry(
                            breadType.id, 
                            'leftover', 
                            parseInt(e.target.value) || 0
                          )}
                          placeholder="0"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Revenue Preview */}
                    {entry && entry.quantity > 0 && (
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <p className="text-sm text-green-800">
                          Revenue: ₦{((entry.quantity * (entry.unit_price || breadType.unit_price)) - (entry.discount || 0)).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Notes Section */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Shift Notes & Feedback (Optional)
                </Label>
                <Textarea
                  placeholder="Any notes about today's sales, customer feedback, or observations..."
                  className="w-full"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  These notes will be saved with your shift feedback for management review.
                </p>
              </div>
            </div>
          </Card>

          {/* Summary & Submit */}
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sales Summary</h3>
              
              {salesEntries.filter(e => e.quantity > 0 || (e.leftover && e.leftover > 0)).length > 0 ? (
                <div className="space-y-2">
                  {salesEntries
                    .filter(e => e.quantity > 0 || (e.leftover && e.leftover > 0))
                    .map(entry => {
                      const breadType = breadTypes.find(b => b.id === entry.bread_type_id);
                      const revenue = (entry.quantity * (entry.unit_price || breadType?.unit_price || 0)) - (entry.discount || 0);
                      
                      return (
                        <div key={entry.bread_type_id} className="flex justify-between items-center py-2 border-b">
                          <div>
                            <span className="font-medium">{breadType?.name}</span>
                            <span className="text-gray-500 ml-2">
                              {entry.quantity} sold{entry.leftover ? `, ${entry.leftover} leftover` : ''}
                            </span>
                          </div>
                          <span className="font-medium">₦{revenue.toLocaleString()}</span>
                        </div>
                      );
                    })}
                    
                  <div className="flex justify-between items-center pt-2 font-semibold text-lg">
                    <span>Total Revenue:</span>
                    <span>₦{salesEntries
                      .filter(e => e.quantity > 0)
                      .reduce((sum, entry) => {
                        const breadType = breadTypes.find(b => b.id === entry.bread_type_id);
                        return sum + ((entry.quantity * (entry.unit_price || breadType?.unit_price || 0)) - (entry.discount || 0));
                      }, 0)
                      .toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No sales entries to display
                </p>
              )}

              <Button 
                type="submit" 
                disabled={loading || salesEntries.filter(e => e.quantity > 0 || (e.leftover && e.leftover > 0)).length === 0}
                className="w-full"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Recording Sales...' : 'Record Sales & Leftover'}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}