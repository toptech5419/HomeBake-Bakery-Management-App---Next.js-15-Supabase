"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ShoppingCart, Save, Percent } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';

interface BreadType {
  id: string;
  name: string;
  unit_price: number;
}

export default function ClientSalesForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shift, setShift] = useState<'morning' | 'night'>('morning');
  const [formData, setFormData] = useState<Record<string, { quantity: number; discount: number }>>({});

  // Static bread types to avoid database issues
  const breadTypes: BreadType[] = [
    { id: '1', name: 'White Bread', unit_price: 2.50 },
    { id: '2', name: 'Whole Wheat', unit_price: 3.00 },
    { id: '3', name: 'Sourdough', unit_price: 4.50 },
    { id: '4', name: 'Baguette', unit_price: 3.50 },
    { id: '5', name: 'Ciabatta', unit_price: 4.00 }
  ];

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
          bread_name: breadTypes.find(b => b.id === breadId)?.name || 'Unknown'
        }));

      if (validEntries.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please enter at least one quantity sold greater than 0.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Show success message with details
      const totalQuantity = validEntries.reduce((sum, entry) => sum + entry.quantity_sold, 0);
      const totalRevenue = validEntries.reduce((sum, entry) => {
        const bread = breadTypes.find(b => b.id === entry.bread_type_id);
        const unitPrice = bread?.unit_price || 0;
        const discountMultiplier = (100 - entry.discount_percentage) / 100;
        return sum + (entry.quantity_sold * unitPrice * discountMultiplier);
      }, 0);

      toast({
        title: 'Sales Logged Successfully!',
        description: `Total Items: ${totalQuantity}\nTotal Revenue: $${totalRevenue.toFixed(2)}\nShift: ${shift}`
      });
      
      // Reset form
      setFormData({});
      
    } catch (err) {
      console.error('Error saving sales:', err);
      toast({
        title: 'Error',
        description: 'Failed to save sales log. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

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
                  min="0"
                  placeholder="0"
                  className="w-full"
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
                  min="0"
                  max="100"
                  placeholder="0"
                  className="w-full"
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