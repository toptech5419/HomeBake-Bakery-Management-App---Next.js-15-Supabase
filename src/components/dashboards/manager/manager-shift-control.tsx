"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Textarea } from '@/components/ui/textarea';
import { useShift } from '@/contexts/ShiftContext';
import { useData } from '@/contexts/DataContext';
import { nigeriaTime, formatNigeriaDate } from '@/lib/utils/timezone';
import { 
  Clock, 
  RotateCcw, 
  FileText, 
  Package, 
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users
} from 'lucide-react';

interface ManagerShiftControlProps {
  currentUserId: string;
}

interface ShiftSummary {
  shift: 'morning' | 'night';
  date: string;
  totalProduction: number;
  completedBatches: number;
  pendingBatches: number;
  notes: string;
  handoverTime: string;
  staffCount: number;
}

export function ManagerShiftControl({ }: ManagerShiftControlProps) {
  const { currentShift, toggleShift } = useShift();
  const { productionLogs } = useData();
  const [showHandover, setShowHandover] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [previousShiftSummary, setPreviousShiftSummary] = useState<ShiftSummary | null>(null);

  // Calculate current shift metrics
  const currentShiftData = React.useMemo(() => {
    if (!productionLogs) return null;

    const today = new Date().toISOString().split('T')[0];
    const currentShiftLogs = productionLogs.filter(log => 
      log.shift === currentShift && 
      log.created_at.startsWith(today)
    );

    const totalProduction = currentShiftLogs.reduce((sum, log) => sum + log.quantity, 0);
    const completedBatches = currentShiftLogs.length;

    return {
      totalProduction,
      completedBatches,
      activeTime: 'Active',
      efficiency: completedBatches > 0 ? Math.round((totalProduction / completedBatches) * 100) / 100 : 0
    };
  }, [productionLogs, currentShift]);

  // Load previous shift summary
  useEffect(() => {
    const loadPreviousShiftSummary = () => {
      if (!productionLogs) return;

      const today = new Date().toISOString().split('T')[0];
      const previousShift = currentShift === 'morning' ? 'night' : 'morning';
      
      // For morning shift, get previous night's data
      // For night shift, get previous morning's data (same day)
      const targetDate = currentShift === 'morning' 
        ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : today;

      const previousShiftLogs = productionLogs.filter(log => 
          log.shift === previousShift && 
          log.created_at.startsWith(targetDate)
        );

        const totalProduction = previousShiftLogs.reduce((sum: number, log) => sum + log.quantity, 0);
      const completedBatches = previousShiftLogs.length;

      setPreviousShiftSummary({
        shift: previousShift,
        date: targetDate,
        totalProduction,
        completedBatches,
        pendingBatches: 0, // Would be calculated from actual batch status
        notes: '', // Would be loaded from database
        handoverTime: formatNigeriaDate(new Date().toISOString(), 'h:mm a'),
        staffCount: 3 // Simulated - would be actual staff count
      });
    };

    loadPreviousShiftSummary();
  }, [productionLogs, currentShift]);

  const handleShiftHandover = async () => {
    try {
      // Import the necessary functions
      const { checkAndSaveBatchesToAllBatches, deleteAllBatches } = await import('@/lib/batches/actions');
      
      console.log(`🔄 Starting end shift process for ${currentShift} shift`);
      
      // Step 1: Save batches to all_batches (with duplicate checking)
      const saveResult = await checkAndSaveBatchesToAllBatches(currentShift);
      
      if (saveResult.needsSaving) {
        console.log(`✅ Saved ${saveResult.savedCount} ${currentShift} shift batches to all_batches`);
      } else {
        console.log(`ℹ️ All ${currentShift} shift batches already saved to all_batches`);
      }
      
      // Step 2: Clear batches for current shift using production-grade server action
      await deleteAllBatches(currentShift);
      console.log(`🧹 Cleared ${currentShift} shift batches successfully`);
      
      // Step 3: Clear form and close modal
      setShowHandover(false);
      setHandoverNotes('');
      
      // Step 4: Switch to next shift
      toggleShift();
      
      // Show success feedback
      console.log('✅ Shift handover completed successfully');
      
    } catch (error) {
      console.error('❌ Error in shift handover:', error);
      // In a real implementation, show error to user
      // toast.error(error instanceof Error ? error.message : 'Failed to complete shift handover');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Shift Status */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                currentShift === 'morning' ? 'bg-orange-400' : 'bg-indigo-400'
              }`} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    {currentShift === 'morning' ? 'Morning Shift' : 'Night Shift'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Active since {formatNigeriaDate(new Date().toISOString(), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHandover(true)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              End Shift
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleShift}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Switch Shift
            </Button>
          </div>
        </div>

        {/* Current Shift Metrics */}
        {currentShiftData && (
          <>
            <div className="border-t my-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {currentShiftData.totalProduction}
                </div>
                <div className="text-xs text-muted-foreground">Units Produced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentShiftData.completedBatches}
                </div>
                <div className="text-xs text-muted-foreground">Batches Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {currentShiftData.efficiency}
                </div>
                <div className="text-xs text-muted-foreground">Avg per Batch</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {nigeriaTime.getCurrentShift() === currentShift ? 'Active' : 'Inactive'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {nigeriaTime.getCurrentShift() === currentShift ? 'On Schedule' : 'Off Schedule'}
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Previous Shift Summary */}
      {previousShiftSummary && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              Previous {previousShiftSummary.shift === 'morning' ? 'Morning' : 'Night'} Shift Summary
            </h3>
                         <Badge className="text-xs border border-border bg-background">
               {formatNigeriaDate(previousShiftSummary.date, 'MMM d')}
             </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium">{previousShiftSummary.totalProduction}</div>
                <div className="text-xs text-muted-foreground">Total Production</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium">{previousShiftSummary.completedBatches}</div>
                <div className="text-xs text-muted-foreground">Completed Batches</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-sm font-medium">{previousShiftSummary.pendingBatches}</div>
                <div className="text-xs text-muted-foreground">Pending Items</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm font-medium">{previousShiftSummary.staffCount}</div>
                <div className="text-xs text-muted-foreground">Staff Present</div>
              </div>
            </div>
          </div>

          {previousShiftSummary.notes && (
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm font-medium mb-1">Handover Notes:</div>
              <div className="text-sm text-muted-foreground">{previousShiftSummary.notes}</div>
            </div>
          )}
        </Card>
      )}

      {/* Shift Handover Modal */}
      {showHandover && (
        <Card className="p-6 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-900">End Shift & Handover</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Handover Notes for Next Shift:
              </label>
              <Textarea
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="Enter any important information for the next shift (pending batches, issues, special instructions...)"
                rows={4}
                className="w-full"
              />
            </div>

            <div className="bg-white p-4 rounded-md border">
              <h4 className="font-medium mb-2">Shift Summary:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Total Production: <span className="font-medium">{currentShiftData?.totalProduction || 0} units</span></div>
                <div>Completed Batches: <span className="font-medium">{currentShiftData?.completedBatches || 0}</span></div>
                                 <div>Shift Duration: <span className="font-medium">Active</span></div>
                <div>Handover Time: <span className="font-medium">{formatNigeriaDate(new Date().toISOString(), 'h:mm a')}</span></div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleShiftHandover} className="flex-1">
                Complete Handover & End Shift
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowHandover(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* End Shift Info */}
      <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-200">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-900">Shift Management:</span>
        </div>
        <p className="mt-1 text-blue-800">
          End Shift will save current batches to reports and clear only the current shift&apos;s batches.
        </p>
      </div>
    </div>
  );
}

export default ManagerShiftControl;
