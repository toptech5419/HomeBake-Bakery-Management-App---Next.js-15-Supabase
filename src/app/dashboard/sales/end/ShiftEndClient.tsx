'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BreadType, SalesLog, UserRole } from '@/types';
import { useShift } from '@/hooks/use-shift';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { CheckCircle, ArrowLeft, FileText, Package } from 'lucide-react';
import { toast } from 'sonner';

interface ShiftEndClientProps {
  todaysSales: (SalesLog & { bread_types: BreadType })[];
  breadTypes: BreadType[];
  userRole: UserRole;
  userId: string;
}

export default function ShiftEndClient({
  todaysSales,
  breadTypes,
  userRole,
  userId
}: ShiftEndClientProps) {
  const { shift: currentShift } = useShift();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [leftoverData, setLeftoverData] = useState<{ [key: string]: number }>({});
  const [submitted, setSubmitted] = useState(false);

  // Filter sales for current shift
  const currentShiftSales = todaysSales.filter(sale => sale.shift === currentShift);

  // Calculate shift metrics
  const shiftMetrics = {
    totalRevenue: currentShiftSales.reduce((sum, sale) => 
      sum + (sale.quantity * (sale.unitPrice || 0)), 0),
    totalItems: currentShiftSales.reduce((sum, sale) => 
      sum + sale.quantity, 0),
    totalTransactions: currentShiftSales.length
  };

  const handleLeftoverChange = (breadTypeId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setLeftoverData(prev => ({
      ...prev,
      [breadTypeId]: numValue
    }));
  };

  const handleSubmitReport = async () => {
    setIsSubmitting(true);
    
    try {
      // Here you would normally submit to your API
      // For now, we'll just simulate the submission
      
      console.log('Submitting shift report:', {
        shift: currentShift,
        feedback,
        leftoverData,
        userId,
        shiftMetrics
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success toast
      toast.success('Shift report submitted successfully!');
      
      // Set submitted state immediately - no delays
      setSubmitted(true);
      
    } catch (error) {
      console.error('Failed to submit shift report:', error);
      toast.error('Failed to submit shift report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Shift Report Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Your {currentShift} shift report has been successfully submitted and recorded.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/dashboard/sales'}
              className="w-full"
            >
              Return to Sales
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <h1 className="text-3xl font-bold tracking-tight">End Shift Report</h1>
          <p className="text-muted-foreground">
            Submit your {currentShift} shift report with feedback and leftover inventory
          </p>
        </div>
      </div>

      {/* Shift Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {currentShift === 'morning' ? '☀️ Morning' : '🌙 Night'} Shift Summary
          </h2>
          <Badge>
            {currentShift} shift
          </Badge>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center">
            <p className="text-2xl font-bold">{formatCurrencyNGN(shiftMetrics.totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{shiftMetrics.totalItems}</p>
            <p className="text-sm text-muted-foreground">Items Sold</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{shiftMetrics.totalTransactions}</p>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </div>
        </div>
      </Card>

      {/* Sales Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Sales Summary</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Bread Type</th>
                <th className="text-left p-2">Quantity Sold</th>
                <th className="text-left p-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {breadTypes.map((breadType) => {
                const sales = currentShiftSales.filter(sale => sale.breadTypeId === breadType.id);
                const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
                const totalRevenue = sales.reduce((sum, sale) => 
                  sum + (sale.quantity * (sale.unitPrice || 0)), 0);
                
                if (totalQuantity === 0) return null;
                
                return (
                  <tr key={breadType.id} className="border-b">
                    <td className="p-2">{breadType.name}</td>
                    <td className="p-2">{totalQuantity}</td>
                    <td className="p-2">{formatCurrencyNGN(totalRevenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {currentShiftSales.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No sales recorded for this shift
            </div>
          )}
        </div>
      </Card>

      {/* Leftover Inventory */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Leftover Inventory
        </h2>
        <p className="text-muted-foreground mb-4">
          Record any leftover bread items that remain unsold at the end of your shift.
        </p>
        
        <div className="grid gap-4 md:grid-cols-2">
          {breadTypes.map((breadType) => (
            <div key={breadType.id} className="space-y-2">
              <Label htmlFor={`leftover-${breadType.id}`}>
                {breadType.name} {breadType.size && `(${breadType.size})`}
              </Label>
              <Input
                id={`leftover-${breadType.id}`}
                type="number"
                placeholder="0"
                value={leftoverData[breadType.id] || ''}
                onChange={(e) => handleLeftoverChange(breadType.id, e.target.value)}
                min="0"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Shift Feedback */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Shift Feedback</h2>
        <p className="text-muted-foreground mb-4">
          Share any observations, issues, or notes about your shift.
        </p>
        
        <Textarea
          placeholder="Enter your feedback about the shift... (e.g., customer complaints, equipment issues, popular items, etc.)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
        />
      </Card>

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button 
          onClick={handleSubmitReport}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Shift Report'}
        </Button>
        <Button 
          variant="outline"
          onClick={() => window.location.href = '/dashboard/sales'}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}