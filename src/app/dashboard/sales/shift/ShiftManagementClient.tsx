"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ShiftSelector from '@/components/sales/shift-selector';
import { useShift } from '@/hooks/use-shift';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  Clock, 
  ShoppingCart, 
  DollarSign, 
  FileText, 
  CheckCircle,
  ArrowLeft,
  Calendar
} from 'lucide-react';

interface SalesLog {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price?: number;
  discount?: number;
  shift: 'morning' | 'night';
  created_at: string;
  bread_types?: {
    name: string;
    unit_price: number;
  };
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface ShiftManagementClientProps {
  user: User;
  todaySales: SalesLog[];
}

export default function ShiftManagementClient({
  user,
  todaySales,
}: ShiftManagementClientProps) {
  const { shift } = useShift();
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  // Filter sales by shift
  const morningShiftSales = todaySales.filter(sale => sale.shift === 'morning');
  const nightShiftSales = todaySales.filter(sale => sale.shift === 'night');
  const currentShiftSales = todaySales.filter(sale => sale.shift === shift);

  // Calculate shift statistics
  const calculateShiftStats = (shiftSales: SalesLog[]) => {
    const totalUnits = shiftSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalRevenue = shiftSales.reduce((sum, sale) => {
      const price = sale.unit_price || sale.bread_types?.unit_price || 0;
      const discount = (sale.discount || 0) / 100;
      return sum + (sale.quantity * price * (1 - discount));
    }, 0);
    return { totalUnits, totalRevenue };
  };

  const morningStats = calculateShiftStats(morningShiftSales);
  const nightStats = calculateShiftStats(nightShiftSales);
  const currentShiftStats = calculateShiftStats(currentShiftSales);

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast.error('Please enter some feedback before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      // Here you would submit the feedback to your backend
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Shift feedback submitted successfully!');
      setFeedback('');
      router.push('/dashboard/sales');
    } catch (error) {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shift Management</h1>
          <p className="text-muted-foreground">
            Manage your shift and submit end-of-shift feedback
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/sales')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales
          </Button>
        </div>
      </div>

      {/* Current Date */}
      <Card className="p-4">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-muted-foreground mr-2" />
          <span className="font-medium">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </Card>

      {/* Shift Selector */}
      <ShiftSelector />

      {/* Current Shift Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Current Shift Summary</h2>
          <Badge color={shift === 'morning' ? 'morning' : 'night'}>
            {shift === 'morning' ? '☀️ Morning' : '🌙 Night'} Shift
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-muted-foreground">Units Sold</p>
              <p className="text-2xl font-bold">{currentShiftStats.totalUnits}</p>
            </div>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
                             <p className="text-2xl font-bold">₦{currentShiftStats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {currentShiftSales.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              {currentShiftSales.length} sales entries recorded for this shift
            </p>
          </div>
        )}
      </Card>

      {/* Daily Overview */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Today's Overview</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Morning Shift */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">☀️ Morning Shift</h3>
              <Badge color="morning">{morningShiftSales.length} entries</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Units:</span>
                <span className="font-medium">{morningStats.totalUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Revenue:</span>
                <span className="font-medium">₦{morningStats.totalRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Night Shift */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">🌙 Night Shift</h3>
              <Badge color="night">{nightShiftSales.length} entries</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Units:</span>
                <span className="font-medium">{nightStats.totalUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Revenue:</span>
                <span className="font-medium">₦{nightStats.totalRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* End-of-Shift Feedback */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <FileText className="h-5 w-5 mr-2" />
          <h2 className="text-xl font-semibold">End-of-Shift Feedback</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="feedback" className="text-base">
              Share any notes, issues, or observations from your shift
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Include details about customer interactions, product availability, or any problems encountered.
            </p>
            <Textarea
              id="feedback"
              placeholder="Enter your shift feedback here..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          
          <Button
            onClick={handleSubmitFeedback}
            disabled={submitting || !feedback.trim()}
            className="w-full sm:w-auto"
            size="lg"
          >
            {submitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Shift Feedback
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}