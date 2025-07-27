"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShift } from '@/contexts/ShiftContext';
import { useEndShiftContext } from '@/contexts/EndShiftContext';
import { Clock, RotateCcw, Settings, Sun, Moon, Power, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface ShiftToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

export default function ShiftToggle({ showLabel = true, compact = false }: ShiftToggleProps) {
  const { currentShift, toggleShift } = useShift();
  const { onEndShift } = useEndShiftContext();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  // Handle end shift functionality
  const handleEndShift = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 ShiftToggle: End shift button clicked');
      await onEndShift();
      setShowModal(false);
      toast.success('Shift ended successfully!');
    } catch (error) {
      console.error('❌ Error ending shift:', error);
      toast.error('Failed to end shift. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <motion.div 
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Badge className={`flex items-center gap-1 backdrop-blur-sm border ${
            currentShift === 'morning' 
              ? 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 border-orange-200' 
              : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border-indigo-200'
          }`}>
            <Clock className="h-3 w-3" />
            {currentShift === 'morning' ? '🌅' : '🌙'} {currentShift}
          </Badge>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleShift}
            className="p-1 h-6 w-6 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm" />
      
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 rounded-2xl border border-white/20 shadow-xl bg-white/70 backdrop-blur-md">
        {showLabel && (
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-gray-800 text-lg">Shift Control</span>
          </motion.div>
        )}
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {/* Current Shift Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-lg backdrop-blur-sm ${
              currentShift === 'morning' 
                ? 'bg-gradient-to-r from-orange-100 to-yellow-100 border-orange-200 text-orange-800' 
                : 'bg-gradient-to-r from-indigo-100 to-purple-100 border-indigo-200 text-indigo-800'
            }`}>
              <div className={`p-2 rounded-lg ${
                currentShift === 'morning' 
                  ? 'bg-gradient-to-br from-orange-500 to-yellow-500' 
                  : 'bg-gradient-to-br from-indigo-500 to-purple-500'
              }`}>
                {currentShift === 'morning' ? (
                  <Sun className="h-5 w-5 text-white" />
                ) : (
                  <Moon className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg">
                  {currentShift === 'morning' ? '🌅 Morning' : '🌙 Night'} Shift
                </span>
                <span className="text-xs opacity-75">
                  {currentShift === 'morning' ? '8 AM - 6 PM' : '8 PM - 7 AM'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Toggle Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={toggleShift}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-white to-gray-50 border-2 border-blue-200 rounded-xl shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300 font-semibold text-blue-700 hover:text-blue-800"
            >
              <motion.div
                animate={{ rotate: isHovered ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
              >
                <RotateCcw className="h-5 w-5" />
              </motion.div>
              <span>Switch to {currentShift === 'morning' ? 'Night' : 'Morning'}</span>
            </Button>
          </motion.div>

          {/* End Shift Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              type="button"
              size="lg"
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold border-0"
              onClick={() => setShowModal(true)}
              disabled={isLoading}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <Power className="h-5 w-5" />
              )}
              <span>End Shift</span>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="End Shift?">
        <motion.div 
          className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-md mx-auto border border-gray-100"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">End Current Shift?</h3>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to end your current shift? This will clear all recorded sales for the {currentShift} shift.
            </p>
          </div>
          
          <div className="flex gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <Button
                type="button"
                size="lg"
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleEndShift}
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                ) : (
                  <Power className="h-5 w-5 mr-2" />
                )}
                {isLoading ? 'Ending Shift...' : 'Proceed'}
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
                className="w-full border-2 border-gray-300 hover:border-gray-400 rounded-xl font-semibold transition-all duration-300"
              >
                Cancel
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </Modal>
    </motion.div>
  );
}