"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ShoppingCart, Save, Percent } from 'lucide-react';
import { insertSalesLog } from '@/lib/sales/actions';

interface BreadType {
  id: string;
  name: string;
  unit_price: number;
}

interface SalesFormProps {
  breadTypes: BreadType[];
  userId: string;
  onSuccess?: () => void;
}

export default function SimpleSalesForm({ breadTypes, userId, onSuccess }: SalesFormProps) {
  const [loading, setLoading] = useState(false);
  const [shift, setShift] = useState<'morning' | 'night'>('morning');
  const [formData, setFormData] = useState<Record<string, { quantity: number; discount: number }>>({});

  const handleInputChange = (breadId: string, field: 'quantity' | 'discount', value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      [breadId]: {
        ...prev[breadId],
        [field]: numValue
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Filter entries with quantity > 0
      const validEntries = Object.entries(formData)
        .filter(([_, data]) => data.quantity > 0)
        .map(([breadId, data]) => ({
          bread_type_id: breadId,
          quantity_sold: data.quantity,
          discount_percentage: data.discount,
          shift,
          user_id: userId
        }));

      if (validEntries.length === 0) {
        alert('Please enter at least one quantity sold greater than 0.');
        setLoading(false);
        return;
      }

      // Save each sales entry to the database
      let successCount = 0;
      for (const entry of validEntries) {
        const result = await insertSalesLog(entry);
        if (result.success) {
          successCount++;
        } else {
          console.error('Failed to save sales entry:', result.error);
        }
      }

      if (successCount > 0) {
        alert(`Successfully saved ${successCount} sales entries!`);
        setFormData({});
        onSuccess?.();
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alert('Failed to save any sales entries. Please try again.');
      }
    } catch (err) {
      console.error('Error saving sales:', err);
      alert('Failed to save sales log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!breadTypes.length) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <ShoppingCart className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No bread types available for sale</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please ask an owner or manager to add bread types first.
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <div className="flex items-center justify-between mb-6">
        <span className="text-lg font-semibold">Log Sales</span>
        <div className="flex items-center gap-2">
          <Button
            variant={shift === 'morning' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShift('morning')}
            disabled={loading}
          >
            Morning
          </Button>
          <Button
            variant={shift === 'night' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShift('night')}
            disabled={loading}
          >
            Night
          </Button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {breadTypes.map((bread) => (
          <div key={bread.id} className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">{bread.name}</Label>
              <span className="text-sm text-muted-foreground">
                ${bread.unit_price.toFixed(2)} each
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`quantity-${bread.id}`} className="text-sm">
                  Quantity Sold
                </Label>
                <Input
                  id={`quantity-${bread.id}`}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  placeholder="Enter quantity"
                  className="w-full text-lg"
                  value={formData[bread.id]?.quantity || ''}
                  onChange={(e) => handleInputChange(bread.id, 'quantity', e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor={`discount-${bread.id}`} className="text-sm flex items-center">
                  <Percent className="h-3 w-3 mr-1" />
                  Discount %
                </Label>
                <Input
                  id={`discount-${bread.id}`}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  max="100"
                  placeholder="Enter discount %"
                  className="w-full text-lg"
                  value={formData[bread.id]?.discount || ''}
                  onChange={(e) => handleInputChange(bread.id, 'discount', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        ))}
        
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving Sales Log...' : 'Save Sales Log'}
        </Button>
      </form>
    </Card>
  );
} 